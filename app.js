// app.js — state, spaced-repetition bookkeeping, and rendering.
// Depends on content.js (DECKS, ICONS, iconSvg), storage.js (Storage,
// encodeProgressBlob, decodeProgressBlob), srs.js (SRS), challenges.js
// (Challenges), profiles.js (Profiles) and quiz.js (question types) being loaded first.
// Nothing runs until someone picks a profile; each profile's state is loaded fresh.

const LEVEL_UNLOCK_BOX = 2; // a level "unlocks the next one" once every card has been gotten right twice, on schedule
const MASTER_BOX = 4; // a deck is "mastered" once every card is on a week-long (or longer) gap
const ALL = 'all'; // levelByDeck value meaning "review the whole deck"
const MINE = 'mine'; // the deck of your own phrases (added per profile, see "My phrases")
const BUILT_IN_DECKS = Object.keys(DECKS); // captured before "My phrases" is added

const freshState = () => ({
  deck: 'everyday',
  levelByDeck: {},   // deckKey -> level index | ALL (unset = pick a sensible default)
  unlocked: {},      // deckKey -> unlock progress, see unlockProgress(). Persisted; never goes down.
  mode: 'flash',
  quizType: 'mixed', // one of QUIZ_TYPE_IDS (quiz.js); saved per profile
  difficulty: 'normal', // one of DIFFICULTY_IDS (quiz.js); saved per profile
  speakInMix: false, // include "say it out loud" questions in Mixed
  q: null,           // {key, type}: the current quiz question's type, fixed while it's on screen
  tricky: null,      // card ids, while practising a hand-picked round (trickiest phrases, or a search result)
  trickyLabel: '',   // what that round is, for its banner
  talkPick: {},      // deckKey -> which conversation is showing
  talkEnglish: false, // show the English under each conversation line
  practice: false,   // true = the session includes cards that aren't due yet
  idx: 0,
  flipped: false,
  order: [],         // indexes into activeCards() for this session
  quizAnswered: false,
  correctCount: 0,
  levelUp: null,     // {deck, to} once an answer unlocks something new; shown straight away
  notice: '',        // one-off message shown under the next flashcard
  correctTotal: 0,   // every correct answer ever (stored under the old 'streak' key)
  stats: Challenges.blankStats(), // day streak, daily challenges, achievements
  progress: {},      // cardId -> {box, due}
  syncPanel: null,   // null | 'export' | 'import'
  syncMessage: '',
});
let state = freshState();

// The signed-in profile's name, for personal touches.
function userName(){ const p = Profiles.current(); return p ? p.name : ''; }
// "¡Buenos días!" -> "¡Buenos días, Sam!"
function withName(text){ const n = userName(); return n ? text.replace(/!$/, () => ', ' + n + '!') : text; }

function shuffled(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function esc(s){
  return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

// ---- card ids ----
// Progress is keyed by deck + Spanish text, so adding, reordering or removing
// cards in content.js never moves progress onto a different phrase.
// (Fixing a typo in a card's `es` text does reset that one card.)
function cardId(deckKey, card){ return deckKey + '/' + card.es; }

const CARD_IDS = new Set();
const LEGACY_IDS = {}; // old positional "deck:level:index" ids, and ids from a card's `was` text -> current id
function registerDeck(key){
  DECKS[key].levels.forEach((lvl, li) => lvl.cards.forEach((c, ci) => {
    const id = cardId(key, c);
    if(CARD_IDS.has(id)) console.warn('Duplicate card in deck "' + key + '": ' + c.es + ' — both copies share progress.');
    CARD_IDS.add(id);
    LEGACY_IDS[key + ':' + li + ':' + ci] = id;
    if(c.was) LEGACY_IDS[cardId(key, {es: c.was})] = id;
  }));
}
Object.keys(DECKS).forEach(registerDeck);

// Returns a clean progress object: legacy ids converted, unknown ids and
// malformed records dropped. Used for both stored and imported progress.
function cleanProgress(raw){
  const out = {};
  if(!raw || typeof raw !== 'object') return out;
  Object.keys(raw).forEach(key => {
    const id = CARD_IDS.has(key) ? key : LEGACY_IDS[key];
    const rec = raw[key];
    if(!id || !SRS.isValidRecord(rec)) return;
    const clean = { box: rec.box, due: rec.due };
    if(rec.seen !== undefined) clean.seen = rec.seen;
    out[id] = out[id] ? SRS.newer(clean, out[id]) : clean;
  });
  return out;
}

function cardRecord(id){
  return Object.prototype.hasOwnProperty.call(state.progress, id) ? state.progress[id] : SRS.blank();
}

// ---- persistence ----
async function loadProgress(){
  try{
    const raw = await Storage.get('progress');
    if(raw){
      const parsed = JSON.parse(raw);
      state.progress = cleanProgress(parsed);
      if(JSON.stringify(state.progress) !== JSON.stringify(parsed)) saveProgress();
    }
  }catch(e){}
  try{
    const raw2 = await Storage.get('streak');
    if(raw2) state.correctTotal = Math.max(0, parseInt(raw2, 10) || 0);
  }catch(e){}
  try{
    const raw4 = await Storage.get('challenges');
    if(raw4) state.stats = Challenges.clean(JSON.parse(raw4));
  }catch(e){}
  try{
    const prefs = JSON.parse((await Storage.get('prefs')) || 'null');
    if(prefs && QUIZ_TYPE_IDS.includes(prefs.quizType)) state.quizType = prefs.quizType;
    if(prefs && DIFFICULTY_IDS.includes(prefs.difficulty)) state.difficulty = prefs.difficulty;
    if(prefs) state.speakInMix = prefs.speakInMix === true;
  }catch(e){}
  try{
    const raw3 = await Storage.get('unlocked');
    if(raw3) state.unlocked = cleanUnlocked(JSON.parse(raw3));
  }catch(e){}
  // Catch up anyone whose saved progress already completes levels.
  Object.keys(DECKS).forEach(key => { state.unlocked[key] = unlockProgress(key); });
  saveUnlocked();
}
async function saveProgress(){ try{ await Storage.set('progress', JSON.stringify(state.progress)); }catch(e){} }
async function saveCorrectTotal(){ try{ await Storage.set('streak', String(state.correctTotal)); }catch(e){} }
async function savePrefs(){ try{ await Storage.set('prefs', JSON.stringify({ quizType: state.quizType, speakInMix: state.speakInMix, difficulty: state.difficulty })); }catch(e){} }
async function saveUnlocked(){ try{ await Storage.set('unlocked', JSON.stringify(state.unlocked)); }catch(e){} }
async function saveStats(){ try{ await Storage.set('challenges', JSON.stringify(state.stats)); }catch(e){} }

function cleanUnlocked(raw){
  const out = {};
  if(!raw || typeof raw !== 'object') return out;
  Object.keys(DECKS).forEach(key => {
    const n = raw[key];
    if(Number.isInteger(n) && n >= 1 && n <= DECKS[key].levels.length + 1) out[key] = n;
  });
  return out;
}

// ---- speech ----
let voices = [];
function loadVoices(){ try{ voices = window.speechSynthesis.getVoices() || []; }catch(e){} }
// Plays your own recording of the phrase if there is one (voice.js), else the phone's voice.
function speak(text){
  if(typeof Voice !== 'undefined' && Voice.has(text)){
    if('speechSynthesis' in window) window.speechSynthesis.cancel();
    Voice.play(text, level().speechRate / DIFFICULTY.normal.speechRate).catch(() => phoneSpeak(text));
    return;
  }
  phoneSpeak(text);
}
function phoneSpeak(text, onEnd){
  if(!('speechSynthesis' in window)){ if(onEnd) onEnd(); return; }
  text = text.replace(/\s*\/\s*/g, ', '); // "orgulloso / orgullosa" -> read both with a pause, not "slash"
  if(!voices.length) loadVoices();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'es-MX';
  const mx = voices.find(v => v.lang === 'es-MX' || v.lang === 'es_MX') || voices.find(v => v.lang && v.lang.startsWith('es'));
  if(mx) u.voice = mx;
  u.rate = level().speechRate; // slower on Fácil, natural speed on Difícil
  if(onEnd){ u.onend = onEnd; u.onerror = onEnd; }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// ---- deck / level progress helpers ----
function levelCards(deckKey, levelIdx){
  return DECKS[deckKey].levels[levelIdx].cards.map(c => Object.assign({}, c, {_id: cardId(deckKey, c)}));
}
function deckCards(deckKey){
  return DECKS[deckKey].levels.reduce((out, _, li) => out.concat(levelCards(deckKey, li)), []);
}
function isLevelComplete(deckKey, levelIdx){
  return levelCards(deckKey, levelIdx).every(c => cardRecord(c._id).box >= LEVEL_UNLOCK_BOX);
}
// 1..levels.length   = that many levels unlocked
// levels.length + 1  = every level completed; whole-deck review unlocked
// Stored and only ever moves forward, so forgetting a card later never re-locks a level.
function unlockProgress(deckKey){
  const len = DECKS[deckKey].levels.length;
  let n = Math.min(state.unlocked[deckKey] || 1, len + 1);
  while(n <= len && isLevelComplete(deckKey, n-1)) n++;
  return n;
}
function unlockedLevelCount(deckKey){ return Math.min(unlockProgress(deckKey), DECKS[deckKey].levels.length); }
function isDeckFinished(deckKey){ return unlockProgress(deckKey) > DECKS[deckKey].levels.length; }
function isDeckMastered(deckKey){
  return deckCards(deckKey).every(c => cardRecord(c._id).box >= MASTER_BOX);
}
function deckTotals(deckKey){
  const cards = deckCards(deckKey);
  return { total: cards.length, known: cards.filter(c => cardRecord(c._id).box >= LEVEL_UNLOCK_BOX).length };
}
function defaultLevel(deckKey){
  return isDeckFinished(deckKey) ? ALL : unlockedLevelCount(deckKey) - 1;
}
function currentLevel(deckKey){
  const lvl = state.levelByDeck[deckKey];
  if(lvl === ALL && isDeckFinished(deckKey)) return ALL;
  if(Number.isInteger(lvl) && lvl < unlockedLevelCount(deckKey)) return lvl;
  return (state.levelByDeck[deckKey] = defaultLevel(deckKey));
}
function isReviewing(){ return currentLevel(state.deck) === ALL; }

// Returns the active pool of cards, each tagged with its stable _id.
function activeCards(){
  if(state.tricky) return state.tricky.map(cardById).filter(Boolean);
  const lvl = currentLevel(state.deck);
  return lvl === ALL ? deckCards(state.deck) : levelCards(state.deck, lvl);
}

// Only cards that are due (unless practising), shuffled then stable-sorted by
// due date so unseen/overdue cards come first — spaced repetition ordering
// with just enough randomness that it doesn't feel robotic.
function sessionOrder(cards, practice){
  const now = Date.now();
  let idxs = shuffled(cards.map((_,i)=>i));
  if(!practice) idxs = idxs.filter(i => SRS.isDue(cardRecord(cards[i]._id), now));
  idxs.sort((a,b) => SRS.dueOf(cardRecord(cards[a]._id)) - SRS.dueOf(cardRecord(cards[b]._id)));
  return idxs;
}

function nextDueTime(cards){
  const now = Date.now();
  const future = cards.map(c => cardRecord(c._id).due).filter(d => d > now);
  return future.length ? Math.min.apply(null, future) : null;
}

// The card with this id, from any deck (tagged with _id), or null if it no longer exists.
function cardById(id){
  const deckKey = id.split('/')[0];
  if(!DECKS[deckKey]) return null;
  const c = deckCards(deckKey).find(x => x._id === id);
  return c || null;
}

// Returns true when a correct answer came before the card was due, so its
// schedule didn't change (practice rounds).
// qtype: which quiz question type was asked (quiz.js), or undefined for flashcards.
function recordAnswer(id, correct, qtype){
  const before = cardRecord(id);
  const after = SRS.answer(before, correct, Date.now());
  const early = after === before;
  if(!early){ state.progress[id] = after; saveProgress(); }
  if(correct){ state.correctTotal++; saveCorrectTotal(); }
  const deckKey = id.split('/')[0]; // the card's own deck (a "trickiest phrases" round mixes decks)
  const was = state.unlocked[deckKey] || 1;
  const reached = unlockProgress(deckKey);
  if(reached > was){
    state.unlocked[deckKey] = reached;
    saveUnlocked();
    state.levelUp = { deck: deckKey, to: reached - 1 }; // index of the new level, or levels.length = deck finished
  }

  // challenges: every answer counts toward the day streak and today's challenges
  const now = Date.now();
  Challenges.recordAnswer(state.stats, { id, deck: deckKey, correct, mode: state.mode, qtype, difficulty: state.difficulty, now });
  if(!early && !state.practice && !activeCards().some(c => SRS.isDue(cardRecord(c._id), now))){
    Challenges.recordCleared(state.stats, now);
  }
  const lastOfRound = state.idx + 1 === state.order.length;
  if(state.mode === 'quiz' && lastOfRound && state.order.length >= 5 && state.correctCount === state.order.length){
    Challenges.recordPerfect(state.stats, now);
  }
  afterChallengeEvent();
  return early;
}

// ---- challenges, greeting and toasts ----
function deckNames(){
  const out = {};
  BUILT_IN_DECKS.forEach(key => { out[key] = DECKS[key].name; }); // not "My phrases": it may be too small for deck challenges
  return out;
}
function achievementContext(){
  const keys = BUILT_IN_DECKS;
  return {
    known: keys.reduce((n, key) => n + deckTotals(key).known, 0),
    totalCards: CARD_IDS.size,
    correctTotal: state.correctTotal,
    levelUps: keys.reduce((n, key) => n + unlockProgress(key) - 1, 0),
    decksFinished: keys.filter(isDeckFinished).length,
    deckCount: keys.length,
    decksMastered: keys.filter(isDeckMastered).length,
  };
}
// Checks for newly finished challenges/achievements, saves, and celebrates them.
function afterChallengeEvent(silent){
  const fresh = Challenges.evaluate(state.stats, achievementContext(), Date.now(), deckNames());
  saveStats();
  if(fresh.length && !silent) showToast(fresh);
  renderChallenges();
  renderStats();
}

let toastTimer = null;
function showToast(items){
  const el = document.getElementById('toast');
  el.innerHTML = items.map(i => i.kind === 'info' ? '<div>' + esc(i.text) + '</div>' : i.kind === 'daily'
    ? '<div>✅ <b>Challenge done:</b> ' + esc(i.text) + '</div>'
    : '<div>🏆 <b>' + esc(i.text) + '</b> \u2014 ' + esc(i.en) + '</div>').join('');
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4500);
}

function timeGreeting(now){
  const h = new Date(now).getHours();
  if(h >= 5 && h < 12) return { es: '¡Buenos días!', en: 'Good morning', icon: 'sun', ask: '¿Cómo amaneciste?', askEn: 'How did you sleep?' };
  if(h >= 12 && h < 19) return { es: '¡Buenas tardes!', en: 'Good afternoon', icon: 'sun', ask: '¿Qué tal tu día?', askEn: 'How\u2019s your day going?' };
  if(h >= 19) return { es: '¡Buenas noches!', en: 'Good evening', icon: 'moon', ask: '¿Cómo te fue hoy?', askEn: 'How did today go?' };
  return { es: '¡Buenas noches!', en: 'It\u2019s late', icon: 'moon', ask: '¿No puedes dormir?', askEn: 'Can\u2019t sleep?' };
}
// Cards due now across everything unlocked.
function dueEverywhere(now){
  return Object.keys(DECKS).reduce((n, key) => {
    const cards = isDeckFinished(key) ? deckCards(key)
      : DECKS[key].levels.slice(0, unlockedLevelCount(key)).reduce((out, _, li) => out.concat(levelCards(key, li)), []);
    return n + cards.filter(c => SRS.isDue(cardRecord(c._id), now)).length;
  }, 0);
}
function renderGreeting(){
  const now = Date.now();
  const g = timeGreeting(now);
  const due = dueEverywhere(now);
  const streak = Challenges.currentStreak(state.stats, now);
  const practisedToday = state.stats.lastDay === Challenges.dayKey(now);
  const phrases = due + ' phrase' + (due === 1 ? '' : 's');
  const status = due && streak && !practisedToday ? 'Keep your ' + streak + '-day streak going \u2014 ' + phrases + ' ready.'
    : due ? phrases + ' ready to practise.'
    : 'All caught up. ' + withName('¡Bien hecho!') + ' (Well done!)';
  const el = document.getElementById('greeting');
  el.innerHTML =
    '<button class="greeting-btn" id="greetingBtn" title="Hear it">' +
      iconSvg(g.icon, 'greeting-icon') +
      '<span class="greeting-text">' +
        '<span class="greeting-es">' + esc(withName(g.es)) + ' <span class="greeting-ask">' + g.ask + '</span> <span class="greeting-speaker">' + SPEAKER_SVG + '</span></span>' +
        '<span class="greeting-en">' + g.en + ' \u2014 ' + g.askEn + '</span>' +
        '<span class="greeting-status">' + esc(status) + '</span>' +
      '</span>' +
    '</button>';
  document.getElementById('greetingBtn').onclick = () => speak(withName(g.es) + ' ' + g.ask);
}

function renderChallenges(){
  const el = document.getElementById('challenges');
  const now = Date.now();
  const daily = Challenges.dailyStatus(state.stats, now, deckNames());
  const doneCount = daily.filter(c => c.done).length;
  const ach = Challenges.achievementStatus(state.stats, achievementContext());
  const earned = ach.filter(a => a.earned).length;
  const wasOpen = !!(document.getElementById('achDetails') || {}).open;
  el.innerHTML =
    '<div class="ch-card">' +
      '<div class="ch-head"><span class="ch-title">Today\u2019s challenges</span><span class="ch-count">' + doneCount + '/' + daily.length + '</span></div>' +
      '<ul class="ch-list">' + daily.map(c =>
        '<li class="ch-item' + (c.done ? ' complete' : '') + '">' +
          '<span class="ch-check" aria-hidden="true">' + (c.done ? '✓' : '') + '</span>' +
          '<span class="ch-text">' + esc(c.text) + (c.done ? '<span class="sr-only"> (done)</span>' : '') + '</span>' +
          '<span class="ch-prog">' + c.value + '/' + c.target + '</span>' +
          '<span class="ch-bar"><span style="width:' + Math.round(c.value / c.target * 100) + '%"></span></span>' +
        '</li>').join('') + '</ul>' +
      (doneCount === daily.length ? '<div class="ch-alldone">' + esc(withName('¡Reto cumplido!')) + ' (Challenge met!) New challenges tomorrow.</div>' : '') +
      '<details class="ach" id="achDetails"' + (wasOpen ? ' open' : '') + '>' +
        '<summary>Achievements \u00b7 ' + earned + ' of ' + ach.length + '</summary>' +
        '<div class="ach-grid">' + ach.map(a =>
          '<div class="ach-item' + (a.earned ? ' earned' : '') + '">' +
            iconSvg(a.icon, 'ach-icon') +
            '<div><div class="ach-es">' + esc(a.es) + '</div><div class="ach-en">' + esc(a.en) + '</div>' +
            (a.earned ? '' : '<div class="ach-prog">' + a.value + '/' + a.target + '</div>') + '</div>' +
          '</div>').join('') + '</div>' +
      '</details>' +
    '</div>';
}

// Plays a card's phrase; counts toward the listening challenges.
function hearCard(text){
  speak(text);
  Challenges.recordListen(state.stats, Date.now());
  afterChallengeEvent();
}

function resetDeckState(){
  const cards = activeCards();
  state.idx = 0;
  state.flipped = false;
  state.order = sessionOrder(cards, state.practice);
  state.quizAnswered = false;
  state.correctCount = 0;
  state.notice = '';
  state.q = null;
}

function startSession(practice){ state.practice = !!practice; resetDeckState(); render(); }
// Changing deck or level dismisses a pending level-up; switching Flashcards/Quiz doesn't.
function selectDeck(key){ state.deck = key; state.levelUp = null; state.tricky = null; startSession(false); }
function selectLevel(deckKey, levelIdx){
  if(levelIdx === ALL ? !isDeckFinished(deckKey) : levelIdx >= unlockedLevelCount(deckKey)) return;
  state.levelByDeck[deckKey] = levelIdx;
  state.levelUp = null;
  state.tricky = null;
  startSession(false);
}

// ---- rendering ----
function renderDecks(){
  const el = document.getElementById('decks');
  el.innerHTML = '';
  Object.keys(DECKS).forEach(key=>{
    const d = DECKS[key];
    const totals = deckTotals(key);
    const pct = totals.total ? Math.round((totals.known/totals.total)*100) : 0;
    const mastered = isDeckMastered(key);
    const lvl = key === state.deck ? currentLevel(key) : defaultLevel(key);
    const label = mastered ? 'Mastered' + (lvl === ALL ? ' · reviewing' : '')
      : lvl === ALL ? 'All levels · reviewing'
      : key === MINE ? 'Your own phrases'
      : 'Level ' + (lvl+1) + ' of ' + d.levels.length;
    const btn = document.createElement('button');
    btn.className = 'deck-btn' + (state.deck === key ? ' active' : '');
    btn.setAttribute('aria-pressed', state.deck === key ? 'true' : 'false');
    btn.innerHTML =
      (mastered ? '<div class="mastered-badge" aria-hidden="true">✨</div>' : '') +
      deckBadge(d) +
      '<div class="deck-info"><div class="deck-name">' + esc(d.name) + '</div>' +
      '<div class="deck-meta"><span class="deck-level">' + label + '</span>' +
      '<span class="deck-progress">' + totals.known + '/' + totals.total + '</span></div></div>' +
      '<div class="deck-bar"><div class="deck-bar-fill" style="width:' + pct + '%"></div></div>';
    btn.onclick = () => selectDeck(key);
    el.appendChild(btn);
  });
}

function renderLevelChips(){
  const el = document.getElementById('levelChips');
  const deck = DECKS[state.deck];
  const unlocked = unlockedLevelCount(state.deck);
  const active = currentLevel(state.deck);
  el.innerHTML = '';
  deck.levels.forEach((lvl, i) => {
    const chip = document.createElement('button');
    const locked = i >= unlocked;
    const done = isLevelComplete(state.deck, i);
    chip.className = 'level-chip' + (i === active ? ' active' : '') + (done ? ' done' : '') + (locked ? ' locked' : '');
    chip.textContent = (locked ? '🔒 ' : done ? '✓ ' : '') + lvl.label;
    chip.disabled = locked;
    if(locked) chip.title = 'Finish the previous level to unlock';
    chip.onclick = () => selectLevel(state.deck, i);
    el.appendChild(chip);
  });
  if(isDeckFinished(state.deck)){
    const chip = document.createElement('button');
    chip.className = 'level-chip' + (active === ALL ? ' active' : '');
    chip.textContent = 'All';
    chip.title = 'Review the whole deck';
    chip.onclick = () => selectLevel(state.deck, ALL);
    el.appendChild(chip);
  }
}

function renderModes(){
  document.getElementById('modeFlash').classList.toggle('active', state.mode==='flash');
  document.getElementById('modeQuiz').classList.toggle('active', state.mode==='quiz');
  document.getElementById('modeTalk').classList.toggle('active', state.mode==='talk');
}

function renderStats(){
  const known = Object.keys(DECKS).reduce((n, key) => n + deckTotals(key).known, 0);
  const streak = Challenges.currentStreak(state.stats, Date.now());
  document.getElementById('streak').innerHTML =
    '<span>🔥 ' + (streak ? '<b>' + streak + '</b>-day streak' : 'No streak yet') + ' · <b>' + known + '</b> phrases known · <b>' + state.correctTotal + '</b> correct answers</span>';
}

function renderBanner(){
  const el = document.getElementById('reviewBanner');
  let html = '';
  if(isReviewing()){
    const name = esc(DECKS[state.deck].name);
    html += '<div class="review-banner">' + (isDeckMastered(state.deck)
      ? 'Every phrase in ' + name + ' is solid — each one is on a gap of a week or more. Keep getting them right and the gaps keep growing, up to three months.'
      : 'You’ve finished every level in ' + name + '. Now the whole deck is mixed together, and each phrase comes back when it’s due.') +
      '</div>';
  }
  if(state.tricky){
    html += '<div class="practice-banner">' + esc(state.trickyLabel || 'Practising your trickiest phrases.') + ' ' +
      '<button class="link-btn" id="exitTrickyBtn">Back to your decks</button></div>';
  }
  if(state.practice && !state.tricky){
    html += '<div class="practice-banner">Practice round: includes cards that aren’t due yet. Those only move up once they’re due, so this won’t rush the schedule. ' +
      '<button class="link-btn" id="exitPracticeBtn">Back to due cards</button></div>';
  }
  el.innerHTML = html;
  const exitTricky = document.getElementById('exitTrickyBtn');
  if(exitTricky) exitTricky.onclick = () => { state.tricky = null; startSession(false); };
  const exit = document.getElementById('exitPracticeBtn');
  if(exit) exit.onclick = () => startSession(false);
}

// Calendar-aware, so 11pm → 1am reads "tomorrow", not "later today".
function dueText(due){
  const now = Date.now();
  if(due <= now) return 'due now';
  const mins = Math.ceil((due - now) / 60000);
  if(mins < 60) return 'due in ' + mins + ' min';
  const startOfDay = t => { const d = new Date(t); d.setHours(0,0,0,0); return d.getTime(); };
  const days = Math.round((startOfDay(due) - startOfDay(now)) / (24*60*60*1000));
  if(days <= 0) return 'due later today';
  if(days === 1) return 'due tomorrow';
  return 'due in ' + days + ' days';
}
function dueLabel(id){ return dueText(cardRecord(id).due); }

function bigButton(id, text, primary){
  return '<button class="ctrl-btn' + (primary ? ' primary' : '') + ' end-btn" id="' + id + '">' + text + '</button>';
}

// Shown as soon as an answer unlocks a level (or finishes the deck), in either mode.
function renderLevelUp(){
  const stage = document.getElementById('stage');
  const deckKey = state.deck;
  const deckLevels = DECKS[deckKey].levels;
  const to = state.levelUp.to;
  const moreLeft = state.idx < state.order.length;
  const stay = moreLeft ? bigButton('stayBtn', 'Finish this round first', false) : '';
  if(to < deckLevels.length){
    stage.innerHTML =
      '<div class="done"><h2>Level up! 🎉</h2>' +
      '<p>You know every phrase in ' + esc(deckLevels[to-1].label) + '. ' + esc(deckLevels[to].label) + ' just unlocked.</p>' +
      bigButton('nextLevelBtn', 'Start ' + esc(deckLevels[to].label), true) + stay + '</div>';
    document.getElementById('nextLevelBtn').onclick = () => selectLevel(deckKey, to);
  } else {
    stage.innerHTML =
      '<div class="done"><h2>Deck complete! 🎉</h2>' +
      '<p>You know every phrase in ' + esc(DECKS[deckKey].name) + '. From now on the whole deck is mixed together and each phrase comes back when it’s due.</p>' +
      bigButton('reviewAllBtn', 'Review the whole deck', true) + stay + '</div>';
    document.getElementById('reviewAllBtn').onclick = () => selectLevel(deckKey, ALL);
  }
  if(moreLeft) document.getElementById('stayBtn').onclick = () => { state.levelUp = null; renderStage(); };
}

// Shown when the session queue runs out, in either mode.
function renderEnd(){
  const stage = document.getElementById('stage');
  const cards = activeCards();
  const now = Date.now();
  const dueNow = cards.some(c => SRS.isDue(cardRecord(c._id), now));
  const scope = isReviewing() ? 'this deck' : 'this level';
  let title, body;
  if(state.order.length === 0){
    title = 'All caught up';
    body = 'Nothing in ' + scope + ' is due right now.';
  } else if(state.mode === 'quiz'){
    title = state.correctCount + '/' + state.idx + ' correct';
    body = state.practice ? 'Practice round done.' : 'That’s every due card in ' + scope + '.';
  } else {
    title = 'Session complete';
    body = state.practice ? 'You’ve been through every card in ' + scope + '.' : 'You’ve gone through every due card in ' + scope + '.';
  }
  const next = nextDueTime(cards);
  if(!dueNow && next) body += ' The next one is ' + dueText(next) + '.';

  const notice = state.notice ? '<div class="quiz-note" role="status">' + esc(state.notice) + '</div>' : '';
  state.notice = '';
  stage.innerHTML =
    '<div class="done">' + notice + '<h2>' + title + '</h2><p>' + body + '</p>' +
    (dueNow ? bigButton('keepGoingBtn', 'Keep going', true) : '') +
    bigButton('practiceBtn', state.practice ? 'Go again' : 'Practice anyway', !dueNow) +
    '</div>';
  if(dueNow) document.getElementById('keepGoingBtn').onclick = () => startSession(false);
  document.getElementById('practiceBtn').onclick = () => startSession(true);
}

function renderStage(){
  if(state.levelUp && state.levelUp.deck === state.deck) renderLevelUp();
  else if(state.mode === 'talk') renderTalk(); // conversations aren't tied to due cards either
  else if(state.mode === 'quiz' && state.quizType === 'match') renderMatch(); // not tied to due cards
  else if(state.idx >= state.order.length) renderEnd();
  else if(state.mode === 'flash') renderFlash();
  else renderQuiz();
}

function nextCard(){ state.idx++; state.flipped = false; state.quizAnswered = false; render(); }

function renderFlash(){
  const stage = document.getElementById('stage');
  const cards = activeCards();
  const cardIdx = state.order[state.idx];
  const card = cards[cardIdx];
  stage.innerHTML =
    '<div class="card-scene"><div class="card ' + (state.flipped?'flipped':'') + '" id="flipCard" role="button" tabindex="0" ' +
        'aria-pressed="' + state.flipped + '" aria-label="Flip card">' +
      '<div class="face face-front">' +
        '<div class="due-badge">' + dueLabel(card._id) + '</div>' +
        '<button class="sound-btn" id="soundBtn" title="Hear it" aria-label="Hear it">' + SPEAKER_SVG + '</button>' +
        iconSvg(card.icon) +
        '<div class="card-word">' + esc(card.es) + '</div>' +
        (level().showPron && card.pron ? '<div class="card-sub" style="opacity:0.75;font-style:italic;">' + esc(card.pron) + '</div>' : '') +
        '<div class="card-hint">tap to reveal</div>' +
      '</div>' +
      '<div class="face face-back">' +
        '<button class="sound-btn" id="soundBtnBack" title="Hear it" aria-label="Hear it">' + SPEAKER_SVG + '</button>' +
        iconSvg(card.icon) +
        '<div class="card-word" style="font-size:20px;">' + esc(card.en) + '</div>' +
        '<div class="card-sub">' + esc(card.es) + (card.pron ? ' · ' + esc(card.pron) : '') + '</div>' +
        '<div class="back-actions">' + (card.why ? '<button class="share-btn" id="whyBtn">Why?</button>' : '') +
          '<button class="share-btn" id="shareBtn">Share</button></div>' +
      '</div>' +
    '</div></div>' +
    '<div class="card-controls">' +
      '<button class="ctrl-btn" id="skipBtn">Not yet</button>' +
      '<button class="ctrl-btn good" id="knowBtn">I know this</button>' +
    '</div>' +
    (card.why ? '<div class="why-note" id="whyNote" hidden><b>Why?</b> ' + esc(card.why) + '</div>' : '') +
    (state.notice ? '<div class="quiz-note" role="status">' + esc(state.notice) + '</div>' : '');
  state.notice = '';

  const flipCard = document.getElementById('flipCard');
  // Toggle the class on the existing element (not a re-render) so the CSS flip animates.
  const flip = () => {
    state.flipped = !state.flipped;
    flipCard.classList.toggle('flipped', state.flipped);
    flipCard.setAttribute('aria-pressed', String(state.flipped));
    if(state.flipped){ Challenges.recordFlip(state.stats, Date.now()); afterChallengeEvent(); }
  };
  flipCard.onclick = (e) => { if(!e.target.closest('.sound-btn')) flip(); };
  flipCard.onkeydown = (e) => {
    if(e.target !== flipCard) return;
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); flip(); }
  };
  document.getElementById('soundBtn').onclick = (e) => { e.stopPropagation(); hearCard(card.es); };
  document.getElementById('soundBtnBack').onclick = (e) => { e.stopPropagation(); hearCard(card.es); };
  document.getElementById('shareBtn').onclick = (e) => { e.stopPropagation(); sharePhrase(card); };
  if(card.why) document.getElementById('whyBtn').onclick = (e) => {
    e.stopPropagation();
    const note = document.getElementById('whyNote');
    note.hidden = !note.hidden;
  };
  document.getElementById('skipBtn').onclick = () => {
    recordAnswer(card._id, false);
    // show it again later in this session, unless it's already queued again
    if(state.order.indexOf(cardIdx, state.idx + 1) === -1) state.order.push(cardIdx);
    nextCard();
  };
  document.getElementById('knowBtn').onclick = () => {
    if(recordAnswer(card._id, true)) state.notice = 'That one wasn’t due yet, so its schedule didn’t change.';
    nextCard();
  };
}

// Quiz answers drop the parenthetical notes ("(Mexican slang)" etc.), which
// would otherwise give the answer away; the full note is shown after answering.
function stripNote(en){ return en.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim(); }
function meaningParts(en){
  return stripNote(en).toLowerCase().split('/')
    .map(s => s.replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}
// True when two answers share a meaning (e.g. "That's cool / awesome" vs "Cool / awesome"),
// so they'd both be right and can't appear together.
function meaningsOverlap(a, b){
  const pa = meaningParts(a), pb = meaningParts(b);
  return pa.some(x => pb.some(y => x === y || (' '+x+' ').includes(' '+y+' ') || (' '+y+' ').includes(' '+x+' ')));
}

// One question per card; its type comes from quiz.js (Mixed picks by card strength).
function renderQuiz(){
  const cards = activeCards();
  const cardIdx = state.order[state.idx];
  const card = cards[cardIdx];
  const key = state.idx + ':' + cardIdx;
  if(!state.q || state.q.key !== key) state.q = { key, type: pickQuizType(card, cards) };
  renderQuestion(state.q.type, card, cardIdx, cards);
}

// ---- sync (export / import) ----
function copyText(ta, onDone){
  const fallback = () => {
    ta.focus();
    ta.setSelectionRange(0, ta.value.length); // select() alone doesn't work on iOS
    let ok = false;
    try{ ok = document.execCommand('copy'); }catch(e){}
    onDone(ok);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(ta.value).then(() => onDone(true), fallback);
  } else fallback();
}

function applyImport(text){
  const payload = decodeProgressBlob(text);
  if(!payload || typeof payload !== 'object') throw new Error('not an object');
  const addedPhrases = mergeCustom(payload.custom);
  const incoming = cleanProgress(payload.progress);
  if(!Object.keys(incoming).length && !addedPhrases) throw new Error('no usable progress');

  // Build everything first, then commit, so a bad code changes nothing.
  const merged = Object.assign({}, state.progress);
  Object.keys(incoming).forEach(id => {
    merged[id] = merged[id] ? SRS.newer(incoming[id], merged[id]) : incoming[id];
  });
  const incomingUnlocked = cleanUnlocked(payload.unlocked);
  const unlocked = Object.assign({}, state.unlocked);
  Object.keys(incomingUnlocked).forEach(key => { unlocked[key] = Math.max(unlocked[key] || 1, incomingUnlocked[key]); });
  const total = Number.isInteger(payload.streak) && payload.streak > 0 ? payload.streak : 0;

  state.progress = merged;
  state.unlocked = unlocked;
  Object.keys(DECKS).forEach(key => { state.unlocked[key] = unlockProgress(key); });
  state.correctTotal = Math.max(state.correctTotal, total);
  if(payload.challenges) state.stats = Challenges.merge(state.stats, payload.challenges);
  saveProgress(); saveUnlocked(); saveCorrectTotal(); saveStats();
  afterChallengeEvent(true);
  state.levelByDeck = {};
  return Object.keys(incoming).length;
}

function renderSync(){
  const panelEl = document.getElementById('syncPanel');
  if(state.syncPanel === 'export'){
    const blob = encodeProgressBlob({ version: 2, progress: state.progress, unlocked: state.unlocked, streak: state.correctTotal, challenges: state.stats, custom: myPhrases, exportedAt: Date.now() });
    panelEl.innerHTML =
      '<div class="sync-panel">' +
        '<textarea id="exportBox" readonly aria-label="Progress code"></textarea>' +
        '<button class="ctrl-btn primary" id="copyExportBtn" style="width:100%;">Copy code</button>' +
        '<div class="sync-note" id="exportNote">Paste this code into Import on the other device/version to bring progress across. It won’t happen automatically — there’s no server behind this app.</div>' +
      '</div>';
    const ta = document.getElementById('exportBox');
    ta.value = blob;
    ta.onclick = () => ta.setSelectionRange(0, ta.value.length);
    document.getElementById('copyExportBtn').onclick = () => copyText(ta, ok => {
      document.getElementById('exportNote').textContent = ok
        ? 'Copied. Now paste it into Import on the other device/version.'
        : 'Couldn’t copy automatically — the code is selected, so copy it by hand.';
    });
  } else if(state.syncPanel === 'import'){
    panelEl.innerHTML =
      '<div class="sync-panel">' +
        '<textarea id="importBox" placeholder="Paste an exported code here" aria-label="Paste an exported code"></textarea>' +
        '<button class="ctrl-btn primary" id="applyImportBtn" style="width:100%;">Apply</button>' +
        '<div class="sync-note" id="importNote"></div>' +
      '</div>';
    document.getElementById('applyImportBtn').onclick = () => {
      let count;
      try{
        count = applyImport(document.getElementById('importBox').value);
      }catch(e){
        document.getElementById('importNote').textContent = 'That code didn’t look right — double check it was copied in full.';
        return;
      }
      state.syncPanel = null;
      state.syncMessage = 'Imported progress for ' + count + ' phrase' + (count === 1 ? '' : 's') + '.';
      startSession(false);
    };
  } else {
    panelEl.innerHTML = state.syncMessage ? '<div class="sync-note">' + esc(state.syncMessage) + '</div>' : '';
    state.syncMessage = '';
  }
}

function render(){
  renderGreeting();
  renderChallenges();
  renderDecks();
  renderLevelChips();
  renderModes();
  renderDifficulty();
  renderQuizOptions();
  renderBanner();
  renderStats();
  renderSync();
  renderStage();
}

document.getElementById('modeFlash').onclick = () => { state.mode='flash'; startSession(false); };
document.getElementById('modeQuiz').onclick = () => { state.mode='quiz'; startSession(false); };
document.getElementById('searchBtn').onclick = () => renderSearchPanel();
document.getElementById('modeTalk').onclick = () => { state.mode='talk'; startSession(false); };
document.getElementById('exportBtn').onclick = () => { state.syncPanel = state.syncPanel === 'export' ? null : 'export'; renderSync(); };
document.getElementById('importBtn').onclick = () => { state.syncPanel = state.syncPanel === 'import' ? null : 'import'; renderSync(); };

// ---- Conversations (conversations.js): short dialogues for the current deck ----
let talkToken = 0; // bumps to cancel "Play all" when something else plays or the view changes
function renderTalk(){
  talkToken++;
  const stage = document.getElementById('stage');
  const list = CONVERSATIONS[state.deck] || [];
  if(!list.length){
    stage.innerHTML = '<div class="done"><p>No conversations for this deck yet. Try Everyday, Love, Family or Food.</p></div>';
    return;
  }
  const pick = Math.min(state.talkPick[state.deck] || 0, list.length - 1);
  const convo = list[pick];
  const key = state.deck + '/' + convo.id;
  const done = !!state.stats.convosDone[key];
  stage.innerHTML =
    (list.length > 1 ? '<div class="panel-chips talk-chips">' + list.map((c, i) => '<button class="level-chip' + (i === pick ? ' active' : '') + '" data-i="' + i + '">' + esc(c.title) + '</button>').join('') + '</div>' : '') +
    '<div class="talk-head"><div class="talk-title">' + esc(convo.title) + (done ? ' <span class="talk-done">\u2713</span>' : '') + '</div>' +
      '<div class="talk-with">With: ' + esc(convo.them) + '</div></div>' +
    '<div class="talk-tools"><button class="ctrl-btn" id="talkPlay">' + SPEAKER_SVG + ' Play all</button>' +
      '<button class="ctrl-btn" id="talkEn">' + (state.talkEnglish ? 'Hide English' : 'Show English') + '</button></div>' +
    '<div class="talk-lines">' + convo.lines.map((l, i) =>
      '<button class="talk-line ' + l[0] + '" data-i="' + i + '">' +
        '<span class="talk-who">' + (l[0] === 'you' ? 'Tú' : esc(convo.them.split(' \u00b7 ')[0])) + '</span>' +
        '<span class="talk-es">' + esc(l[1]) + '</span>' +
        '<span class="talk-en"' + (state.talkEnglish ? '' : ' hidden') + '>' + esc(l[2]) + '</span>' +
      '</button>').join('') + '</div>' +
    '<p class="talk-hint">Tap a line to hear it. Try reading the other part out loud before you tap.</p>' +
    '<button class="ctrl-btn primary talk-finish" id="talkFinish">' + (done ? 'Read it again \u2014 next conversation' : 'I\u2019ve read it \u2713') + '</button>';
  stage.querySelectorAll('.talk-chips .level-chip').forEach(b => { b.onclick = () => { state.talkPick[state.deck] = +b.dataset.i; renderTalk(); }; });
  const lines = [...stage.querySelectorAll('.talk-line')];
  const mark = i => lines.forEach((el, k) => el.classList.toggle('playing', k === i));
  lines.forEach((el, i) => { el.onclick = () => { talkToken++; mark(i); speak(convo.lines[i][1]); }; });
  document.getElementById('talkEn').onclick = () => { state.talkEnglish = !state.talkEnglish; renderTalk(); };
  document.getElementById('talkPlay').onclick = () => {
    const token = ++talkToken;
    const step = i => {
      if(token !== talkToken) return;
      if(i >= convo.lines.length){ mark(-1); return; }
      mark(i);
      phoneSpeak(convo.lines[i][1], () => setTimeout(() => step(i + 1), 350));
    };
    step(0);
  };
  document.getElementById('talkFinish').onclick = () => {
    talkToken++;
    if(!done){ Challenges.recordConvo(state.stats, Date.now(), key); afterChallengeEvent(); }
    state.talkPick[state.deck] = (pick + 1) % list.length;
    renderTalk();
    window.scrollTo(0, document.getElementById('modeFlash').getBoundingClientRect().top + window.scrollY - 10);
  };
}

// ---- My phrases: your own cards, saved per profile as a small deck ----
let myPhrases = []; // [{es, en, pron, ctx}]
function cleanPhrase(p){
  if(!p || typeof p !== 'object') return null;
  const t = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
  const es = t(p.es, 120), en = t(p.en, 160);
  return es && en ? { es, en, pron: t(p.pron, 120), ctx: t(p.ctx, 240) } : null;
}
// Puts "My phrases" into DECKS (or takes it out when empty) and registers its card ids.
function syncMineDeck(){
  CARD_IDS.forEach(id => { if(id.startsWith(MINE + '/')) CARD_IDS.delete(id); });
  if(!myPhrases.length){
    delete DECKS[MINE];
    if(state.deck === MINE) state.deck = 'everyday';
    return;
  }
  DECKS[MINE] = { name: 'My phrases', icon: 'mine', color: '#9A5B3F',
    levels: [{ label: 'My phrases', cards: myPhrases.map(p => ({ es: p.es, en: p.en, pron: p.pron, ctx: p.ctx || undefined, icon: 'star' })) }] };
  registerDeck(MINE);
}
async function loadCustom(){
  myPhrases = [];
  try{
    const raw = JSON.parse((await Storage.get('custom')) || '[]');
    if(Array.isArray(raw)) raw.map(cleanPhrase).filter(Boolean).forEach(p => { if(!myPhrases.some(q => q.es === p.es)) myPhrases.push(p); });
  }catch(e){}
  syncMineDeck();
}
async function saveCustom(){ try{ await Storage.set('custom', JSON.stringify(myPhrases)); }catch(e){} }
// Adds imported phrases that aren't here yet; returns how many were added.
function mergeCustom(list){
  if(!Array.isArray(list)) return 0;
  let added = 0;
  list.map(cleanPhrase).filter(Boolean).forEach(p => { if(!myPhrases.some(q => q.es === p.es)){ myPhrases.push(p); added++; } });
  if(added){ syncMineDeck(); saveCustom(); }
  return added;
}

function renderMinePanel(editIndex){
  const editing = editIndex != null ? myPhrases[editIndex] : null;
  const field = (id, label, value, hint, big) => '<label class="field"><span>' + label + (hint ? ' <em>' + hint + '</em>' : '') + '</span>' +
    (big ? '<textarea id="' + id + '" rows="2">' + esc(value || '') + '</textarea>' : '<input id="' + id + '" type="text" value="' + esc(value || '') + '"' + (id === 'mineEs' ? ' lang="es" autocapitalize="sentences"' : '') + '>') + '</label>';
  showPanel('My phrases',
    '<p class="panel-sub">Add the things you really say at home. They get their own deck and come back for review and quizzes like every other phrase. Saved in this profile.</p>' +
    '<div class="mine-form">' +
      '<div class="mine-form-title">' + (editing ? 'Edit phrase' : 'Add a phrase') + '</div>' +
      field('mineEs', 'Spanish', editing && editing.es) +
      field('mineEn', 'English meaning', editing && editing.en) +
      field('minePron', 'How to say it', editing && editing.pron, '(optional, e.g. meh YAH-mahs)') +
      field('mineCtx', 'When would you say it?', editing && editing.ctx, '(optional \u2014 used in \u201cWhat would you say?\u201d)', true) +
      '<div class="login-error" id="mineError" role="alert"></div>' +
      '<div class="quiz-row">' + (editing ? '<button class="ctrl-btn" id="mineCancel">Cancel</button>' : '') +
        '<button class="ctrl-btn primary" id="mineSave">' + (editing ? 'Save changes' : 'Add phrase') + '</button></div>' +
    '</div>' +
    '<div class="panel-count">' + myPhrases.length + ' phrase' + (myPhrases.length === 1 ? '' : 's') + '</div>' +
    '<ul class="voice-list">' + myPhrases.map((p, i) =>
      '<li class="voice-row"><div class="voice-text"><div class="voice-es">' + esc(p.es) + '</div><div class="voice-en">' + esc(p.en) + '</div></div>' +
        '<div class="voice-btns"><button class="voice-btn" data-act="edit" data-i="' + i + '">Edit</button>' +
        '<button class="voice-btn del" data-act="del" data-i="' + i + '" aria-label="Delete">\u2715</button></div></li>').join('') + '</ul>');
  const val = id => document.getElementById(id).value;
  document.getElementById('mineSave').onclick = () => {
    const p = cleanPhrase({ es: val('mineEs'), en: val('mineEn'), pron: val('minePron'), ctx: val('mineCtx') });
    const err = document.getElementById('mineError');
    if(!p) return (err.textContent = 'Please fill in the Spanish and what it means.');
    if(myPhrases.some((q, i) => q.es.toLowerCase() === p.es.toLowerCase() && i !== editIndex)) return (err.textContent = 'That phrase is already in your list.');
    if(editing){
      // keep its progress if the Spanish changed
      const oldId = cardId(MINE, editing), newId = cardId(MINE, p);
      if(oldId !== newId && state.progress[oldId]){ state.progress[newId] = state.progress[oldId]; delete state.progress[oldId]; saveProgress(); }
      myPhrases[editIndex] = p;
    } else myPhrases.push(p);
    syncMineDeck(); saveCustom();
    showToast([{ kind: 'info', text: editing ? 'Saved.' : 'Added \u201c' + p.es + '\u201d to My phrases.' }]);
    renderMinePanel();
  };
  if(editing) document.getElementById('mineCancel').onclick = () => renderMinePanel();
  document.querySelectorAll('.voice-list .voice-btn').forEach(b => {
    const i = +b.dataset.i;
    b.onclick = () => {
      if(b.dataset.act === 'edit') return renderMinePanel(i);
      if(!b.classList.contains('armed')){ b.classList.add('armed'); b.textContent = 'Delete?'; return; }
      delete state.progress[cardId(MINE, myPhrases[i])]; saveProgress();
      myPhrases.splice(i, 1); syncMineDeck(); saveCustom();
      renderMinePanel();
    };
  });
}

// ---- Search: every phrase, in Spanish or English, accents optional ----
let lastSearch = '';
function searchPhrases(query){
  const q = plainText(query);
  if(q.length < 2) return [];
  const english = s => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = s => ' ' + s + ' ';
  const hits = [];
  Object.keys(DECKS).forEach(k => deckCards(k).forEach(c => {
    const es = plainText(c.es), en = english(c.en);
    let score = null;
    if(es === q) score = 0;
    else if(words(es).includes(' ' + q)) score = 1;          // a Spanish word starts with it
    else if(es.includes(q)) score = 2;
    else if(words(en).includes(' ' + q)) score = 3;          // an English word starts with it
    else if(en.includes(q)) score = 4;
    if(score !== null) hits.push({ card: c, deck: k, score });
  }));
  return hits.sort((a, b) => a.score - b.score || a.card.es.length - b.card.es.length).slice(0, 40);
}
function cardStatus(card, deckKey){
  const rec = cardRecord(card._id);
  const li = DECKS[deckKey].levels.findIndex(l => l.cards.some(c => c.es === card.es));
  const where = DECKS[deckKey].name + (DECKS[deckKey].levels.length > 1 ? ' · ' + DECKS[deckKey].levels[li].label : '');
  const locked = li >= unlockedLevelCount(deckKey);
  const state_ = !rec.due && !rec.box ? 'not started yet' : rec.box >= MASTER_BOX ? 'mastered · ' + dueLabel(card._id)
    : rec.box >= LEVEL_UNLOCK_BOX ? 'known · ' + dueLabel(card._id) : 'learning · ' + dueLabel(card._id);
  return where + (locked ? ' (locked level)' : '') + ' — ' + state_;
}
function renderSearchPanel(){
  showPanel('Search',
    '<input class="type-input search-input" id="searchInput" type="search" placeholder="Search Spanish or English…" autocomplete="off" autocapitalize="off" spellcheck="false">' +
    '<div class="search-hint" id="searchHint"></div><ul class="voice-list search-results" id="searchResults"></ul>');
  const input = document.getElementById('searchInput');
  input.value = lastSearch;
  let timer = null;
  input.oninput = () => { clearTimeout(timer); timer = setTimeout(() => { lastSearch = input.value; showSearchResults(input.value); }, 120); };
  showSearchResults(lastSearch);
  input.focus();
}
function showSearchResults(query){
  const list = document.getElementById('searchResults'), hint = document.getElementById('searchHint');
  const hits = searchPhrases(query);
  hint.textContent = plainText(query).length < 2 ? 'Type a word in Spanish or English — accents are optional.'
    : hits.length ? hits.length + (hits.length === 40 ? '+' : '') + ' phrase' + (hits.length === 1 ? '' : 's') : 'No phrases match “' + query.trim() + '”.';
  list.innerHTML = hits.map((h, i) =>
    '<li class="search-row" data-i="' + i + '">' +
      '<button class="search-main" data-i="' + i + '" aria-expanded="false">' + deckBadge(DECKS[h.deck]) +
        '<span class="voice-text"><span class="voice-es">' + esc(h.card.es) + '</span><span class="voice-en">' + esc(stripNote(h.card.en)) + '</span></span></button>' +
      '<div class="search-detail" hidden>' +
        (h.card.pron ? '<div class="search-pron">' + esc(h.card.pron) + '</div>' : '') +
        (stripNote(h.card.en) !== h.card.en ? '<div class="search-full-en">' + esc(h.card.en) + '</div>' : '') +
        (h.card.why ? '<div class="why-note"><b>Why?</b> ' + esc(h.card.why) + '</div>' : '') +
        '<div class="search-status">' + esc(cardStatus(h.card, h.deck)) + '</div>' +
        '<div class="quiz-row"><button class="ctrl-btn" data-act="hear" data-i="' + i + '">' + SPEAKER_SVG + ' Hear it</button>' +
          '<button class="ctrl-btn" data-act="share" data-i="' + i + '">Share</button>' +
          '<button class="ctrl-btn primary" data-act="practise" data-i="' + i + '">Practise</button></div>' +
      '</div></li>').join('');
  list.querySelectorAll('.search-main').forEach(b => {
    b.onclick = () => {
      const detail = b.parentNode.querySelector('.search-detail');
      detail.hidden = !detail.hidden;
      b.setAttribute('aria-expanded', String(!detail.hidden));
    };
  });
  list.querySelectorAll('[data-act]').forEach(b => {
    const h = hits[+b.dataset.i];
    b.onclick = () => {
      if(b.dataset.act === 'hear') return hearCard(h.card.es);
      if(b.dataset.act === 'share') return sharePhrase(h.card);
      state.tricky = [h.card._id];
      state.trickyLabel = 'Practising “' + h.card.es + '” from your search.';
      state.practice = true; state.levelUp = null;
      if(state.mode === 'talk') state.mode = 'flash';
      resetDeckState();
      closePanel();
    };
  });
}

// ---- Progress page ----
const DAY_MS = 24 * 60 * 60 * 1000;
const fmtDay = t => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
function trickiest(n){
  const misses = state.stats.misses;
  return Object.keys(misses).sort((a, b) => misses[b] - misses[a])
    .map(id => ({ card: cardById(id), misses: misses[id] }))
    .filter(x => x.card && cardRecord(x.card._id).box < MASTER_BOX) // stop listing ones you've since mastered
    .slice(0, n);
}
function renderProgressPanel(){
  const now = Date.now(), st = state.stats;
  const ctx = achievementContext();
  const dayOf = t => st.days[Challenges.dayKey(t)];
  const startOfDay = t => { const d = new Date(t); d.setHours(12, 0, 0, 0); return d.getTime(); }; // noon avoids DST edges
  const today = startOfDay(now);

  // stat tiles
  const tile = (value, label) => '<div class="stat-tile"><div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div>';
  const tiles = '<div class="stat-tiles">' +
    tile(Challenges.currentStreak(st, now), 'day streak') + tile(st.bestStreak, 'best streak') +
    tile(ctx.known + '<span class="stat-of">/' + ctx.totalCards + '</span>', 'phrases known') + tile(state.correctTotal, 'correct answers') + '</div>';

  // practice calendar: last 5 weeks, Monday first
  const mondayOffset = (new Date(today).getDay() + 6) % 7;
  const start = today - (mondayOffset + 28) * DAY_MS;
  const shade = n => n >= 50 ? 4 : n >= 25 ? 3 : n >= 10 ? 2 : n >= 1 ? 1 : 0;
  let cells = '';
  for(let i = 0; i < 35; i++){
    const t = start + i * DAY_MS, d = dayOf(t), n = d ? d.answered : 0;
    if(t > today + DAY_MS / 2){ cells += '<span class="cal-cell future"></span>'; continue; }
    const label = fmtDay(t) + ': ' + (n ? n + ' answer' + (n === 1 ? '' : 's') : 'no practice');
    cells += '<span class="cal-cell s' + shade(n) + (t === today ? ' today' : '') + '" title="' + label + '" aria-label="' + label + '"></span>';
  }
  const calendar = '<section class="prog-section"><h2>Practice days</h2>' +
    '<div class="cal-head">' + ['M','T','W','T','F','S','S'].map(x => '<span>' + x + '</span>').join('') + '</div>' +
    '<div class="cal-grid">' + cells + '</div>' +
    '<div class="cal-key">Less <span class="cal-cell s0"></span><span class="cal-cell s1"></span><span class="cal-cell s2"></span><span class="cal-cell s3"></span><span class="cal-cell s4"></span> More</div></section>';

  // correct answers per day, last 14 days (one series, so no legend: the title names it)
  const days = [];
  for(let i = 13; i >= 0; i--){ const t = today - i * DAY_MS, d = dayOf(t); days.push({ t, v: d ? d.correct : 0 }); }
  const max = Math.max(10, ...days.map(d => d.v));
  const bars = '<section class="prog-section"><h2>Correct answers, last 14 days</h2>' +
    '<div class="bar-readout" id="barReadout">Today: ' + days[13].v + ' correct</div>' +
    '<div class="bar-chart" role="list">' + days.map((d, i) => {
      const label = fmtDay(d.t) + ': ' + d.v + ' correct';
      return '<button class="bar-col" role="listitem" data-label="' + label + '" aria-label="' + label + '">' +
        '<span class="bar' + (d.v ? '' : ' zero') + '" style="height:' + (d.v ? Math.max(4, Math.round(d.v / max * 100)) : 2) + '%"></span></button>';
    }).join('') + '</div>' +
    '<div class="bar-axis">' + days.map((d, i) => '<span>' + (i % 2 === 1 || i === 13 ? new Date(d.t).toLocaleDateString('en-GB', { weekday: 'narrow' }) : '') + '</span>').join('') + '</div>' +
    '<div class="bar-scale">Tallest bar = ' + max + '</div></section>';

  // deck progress
  const decks = '<section class="prog-section"><h2>Decks</h2><ul class="prog-decks">' + Object.keys(DECKS).map(k => {
    const t = deckTotals(k);
    return '<li>' + deckBadge(DECKS[k]) + '<div class="prog-deck-info"><div class="prog-deck-top"><span>' + esc(DECKS[k].name) + '</span><span class="prog-count">' + t.known + '/' + t.total + '</span></div>' +
      '<div class="deck-bar"><div class="deck-bar-fill" style="width:' + Math.round(t.known / t.total * 100) + '%"></div></div></div></li>';
  }).join('') + '</ul></section>';

  // trickiest phrases
  const tricky = trickiest(8);
  const trickyHtml = '<section class="prog-section"><h2>Trickiest phrases</h2>' + (tricky.length
    ? '<ul class="voice-list">' + tricky.map(x => '<li class="voice-row"><div class="voice-text"><div class="voice-es">' + esc(x.card.es) + '</div><div class="voice-en">' + esc(stripNote(x.card.en)) + '</div></div>' +
        '<span class="miss-count">missed ' + x.misses + '×</span></li>').join('') + '</ul>' +
      '<button class="ctrl-btn primary prog-btn" id="practiseTricky">Practise these</button>'
    : '<p class="panel-sub">Nothing tricky yet — phrases you get wrong will show up here.</p>') + '</section>';

  // daily reminder
  const reminder = '<section class="prog-section"><h2>Daily reminder</h2>' +
    '<p class="panel-sub">Adds a daily “Spanish practice” event with an alert to your phone’s calendar.</p>' +
    '<div class="reminder-row"><label class="field reminder-time"><span>Time</span><input type="time" id="reminderTime" value="19:00"></label>' +
    '<a class="ctrl-btn primary prog-btn reminder-link" id="reminderLink" download="spanish-practice.ics">Add to my calendar</a></div></section>';

  showPanel('Your progress', tiles + calendar + bars + decks + trickyHtml + reminder);

  const readout = document.getElementById('barReadout');
  document.querySelectorAll('.bar-col').forEach(b => {
    const show = () => { readout.textContent = b.dataset.label; document.querySelectorAll('.bar-col').forEach(x => x.classList.toggle('on', x === b)); };
    b.onmouseenter = show; b.onfocus = show; b.onclick = show;
  });
  const practise = document.getElementById('practiseTricky');
  if(practise) practise.onclick = () => {
    state.tricky = tricky.map(x => x.card._id);
    state.trickyLabel = 'Practising your trickiest phrases.';
    state.practice = true; state.levelUp = null;
    if(state.mode === 'talk') state.mode = 'flash';
    resetDeckState();
    closePanel();
  };
  const timeInput = document.getElementById('reminderTime'), link = document.getElementById('reminderLink');
  const update = () => { link.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(reminderIcs(timeInput.value || '19:00', now)); };
  timeInput.onchange = update; timeInput.oninput = update;
  update();
}

// A repeating daily calendar event (iCalendar), starting at the next occurrence of `hhmm`.
function reminderIcs(hhmm, now){
  const [h, m] = hhmm.split(':').map(Number);
  const first = new Date(now); first.setHours(h, m, 0, 0);
  if(first.getTime() <= now) first.setDate(first.getDate() + 1);
  const p = n => String(n).padStart(2, '0');
  const local = d => d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + 'T' + p(d.getHours()) + p(d.getMinutes()) + '00';
  const utc = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const url = /^https?:$/.test(location.protocol) ? location.origin + location.pathname : '';
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Aprende Conmigo//Daily reminder//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', 'UID:aprende-reminder-' + now + '@aprende-conmigo', 'DTSTAMP:' + utc(new Date(now)),
    'DTSTART:' + local(first), 'DURATION:PT10M', 'RRULE:FREQ=DAILY',
    'SUMMARY:Spanish practice — Aprende Conmigo',
    'DESCRIPTION:A few minutes of Spanish. ¡Tú puedes!' + (url ? '\\n' + url : ''),
    url ? 'URL:' + url : null,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Time for Spanish!', 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
}

// ---- full-page panels (recordings, my phrases, progress), shown in place of the main app ----
function showPanel(title, html){
  document.getElementById('main').hidden = true;
  const el = document.getElementById('panel');
  el.hidden = false;
  el.innerHTML = '<div class="panel-head"><button class="link-btn panel-back" id="panelBack">\u2190 Back</button></div>' +
    '<h1 class="panel-title">' + title + '</h1>' + html;
  document.getElementById('panelBack').onclick = closePanel;
  window.scrollTo(0, 0);
}
function closePanel(){
  if(typeof Voice !== 'undefined') Voice.stop();
  if(recording){ const r = recording; recording = null; if(r.ctrl) r.ctrl.stop(); } // discard an unfinished recording
  document.getElementById('panel').hidden = true;
  document.getElementById('main').hidden = false;
  render();
}

// ---- your own voice ----
let recording = null; // {key, ctrl} while a clip is being recorded
function renderVoicePanel(deckKey){
  deckKey = deckKey || state.deck;
  const cards = deckCards(deckKey);
  const done = cards.filter(c => Voice.has(c.es)).length;
  const canRec = Voice.canRecord();
  showPanel('Record phrases in your voice',
    '<p class="panel-sub">Record a phrase and every speaker button plays your voice instead of the phone\u2019s. ' +
      'Recordings stay on this phone and are shared by every profile on it.</p>' +
    (canRec ? '' : '<p class="login-note">Recording isn\u2019t available in this browser. Open the app from the Home Screen in Safari, or allow microphone access.</p>') +
    '<div class="panel-chips">' + Object.keys(DECKS).map(k => '<button class="level-chip' + (k === deckKey ? ' active' : '') + '" data-deck="' + k + '">' + esc(DECKS[k].name) + '</button>').join('') + '</div>' +
    '<div class="panel-count">' + done + ' of ' + cards.length + ' recorded</div>' +
    '<ul class="voice-list">' + cards.map((c, i) =>
      '<li class="voice-row' + (Voice.has(c.es) ? ' has' : '') + '">' +
        '<div class="voice-text"><div class="voice-es">' + esc(c.es) + '</div><div class="voice-en">' + esc(stripNote(c.en)) + '</div></div>' +
        '<div class="voice-btns">' +
          (Voice.has(c.es) ? '<button class="voice-btn" data-act="play" data-i="' + i + '" aria-label="Play your recording">' + SPEAKER_SVG + '</button>' : '') +
          (canRec ? '<button class="voice-btn rec" data-act="rec" data-i="' + i + '">' + (Voice.has(c.es) ? 'Redo' : 'Record') + '</button>' : '') +
          (Voice.has(c.es) ? '<button class="voice-btn del" data-act="del" data-i="' + i + '" aria-label="Delete recording">\u2715</button>' : '') +
        '</div></li>').join('') + '</ul>');
  document.querySelectorAll('.panel-chips .level-chip').forEach(b => { b.onclick = () => renderVoicePanel(b.dataset.deck); });
  document.querySelectorAll('.voice-btn').forEach(b => {
    const card = cards[+b.dataset.i];
    b.onclick = async () => {
      if(b.dataset.act === 'play') return Voice.play(card.es).catch(() => {});
      if(b.dataset.act === 'del'){
        if(!b.classList.contains('armed')){ b.classList.add('armed'); b.textContent = 'Delete?'; return; }
        await Voice.remove(card.es); return renderVoicePanel(deckKey);
      }
      // Record / Stop. The clip is handled once, in ctrl.done, whether it
      // ended by tapping Stop or by the 8-second limit.
      // `recording` is claimed before the microphone opens (that can take a moment,
      // e.g. the permission prompt), so a second tap stops rather than starting again.
      if(recording){
        if(recording.key === card.es){ if(recording.ctrl) recording.ctrl.stop(); else recording.stopEarly = true; }
        return;
      }
      const mine = recording = { key: card.es, ctrl: null, stopEarly: false };
      b.textContent = 'Stop'; b.classList.add('recording');
      try{
        const ctrl = await Voice.record(8000);
        mine.ctrl = ctrl;
        if(recording !== mine || mine.stopEarly) ctrl.stop();
        ctrl.done.then(async blob => {
          if(recording !== mine) return;
          recording = null;
          if(blob.size){ await Voice.save(card.es, blob); Voice.play(card.es).catch(() => {}); }
          renderVoicePanel(deckKey);
        });
      }catch(e){
        if(recording === mine) recording = null;
        b.classList.remove('recording');
        b.textContent = 'Mic blocked';
      }
    };
  });
}

// ---- share a phrase (Messages, WhatsApp, …) ----
function sharePhrase(card){
  const text = card.es + (card.pron ? ' (' + card.pron + ')' : '') + ' \u2014 ' + card.en + '\n\nFrom Aprende Conmigo \ud83c\uddf2\ud83c\uddfd';
  const url = /^https?:$/.test(location.protocol) ? location.origin + location.pathname : undefined;
  if(navigator.share){
    navigator.share(url ? { text, url } : { text }).catch(() => {});
  } else {
    const done = ok => showToast([{ kind: 'info', text: ok ? 'Phrase copied \u2014 paste it into a message.' : 'Couldn\u2019t copy it here.' }]);
    if(navigator.clipboard) navigator.clipboard.writeText(text + (url ? '\n' + url : '')).then(() => done(true), () => done(false));
    else done(false);
  }
}

// Offline support when served as a website (not as a single file, artifact or in Scriptable).
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && location.hostname !== 'aprende-conmigo.local'){
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

(async function init(){
  if('speechSynthesis' in window){
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices; // voices load asynchronously in most browsers
  }
  Voice.init();
  Profiles.setMenu([
    { id: 'menuProgress', label: 'Your progress', onClick: () => renderProgressPanel() },
    { id: 'menuMine', label: 'My phrases', onClick: () => renderMinePanel() },
    { id: 'menuVoice', label: 'Record phrases in your voice', onClick: () => renderVoicePanel() },
  ].concat(/^https?:$/.test(location.protocol) // the guide is a page on the website, next to the app
    ? [{ id: 'menuGuide', label: 'How to use this app', onClick: () => { location.href = 'guide.html'; } }] : []));
  // Shows the welcome / "who's practising?" / PIN screen as needed, then loads that profile.
  await Profiles.start(async () => {
    state = freshState();
    await loadCustom();
    await loadProgress();
    afterChallengeEvent(true); // award anything existing progress already earns, quietly
    resetDeckState();
    render();
  });
  // Keep the greeting and today's challenges current if the app stays open past a boundary.
  setInterval(() => {
    if(!Profiles.current()) return;
    renderGreeting(); renderChallenges(); renderStats();
  }, 60 * 1000);
})();
