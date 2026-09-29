// app.js — state, spaced-repetition bookkeeping, and rendering.
// Depends on content.js (DECKS, ICONS, iconSvg), storage.js (Storage,
// encodeProgressBlob, decodeProgressBlob), srs.js (SRS), challenges.js
// (Challenges), profiles.js (Profiles) and quiz.js (question types) being loaded first.
// Nothing runs until someone picks a profile; each profile's state is loaded fresh.

const LEVEL_UNLOCK_BOX = 2; // a level "unlocks the next one" once every card has been gotten right twice, on schedule
const MASTER_BOX = 4; // a deck is "mastered" once every card is on a week-long (or longer) gap
const ALL = 'all'; // levelByDeck value meaning "review the whole deck"

const freshState = () => ({
  deck: 'everyday',
  levelByDeck: {},   // deckKey -> level index | ALL (unset = pick a sensible default)
  unlocked: {},      // deckKey -> unlock progress, see unlockProgress(). Persisted; never goes down.
  mode: 'flash',
  quizType: 'mixed', // one of QUIZ_TYPE_IDS (quiz.js); saved per profile
  difficulty: 'normal', // one of DIFFICULTY_IDS (quiz.js); saved per profile
  speakInMix: false, // include "say it out loud" questions in Mixed
  q: null,           // {key, type}: the current quiz question's type, fixed while it's on screen
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
Object.keys(DECKS).forEach(key => {
  DECKS[key].levels.forEach((lvl, li) => lvl.cards.forEach((c, ci) => {
    const id = cardId(key, c);
    if(CARD_IDS.has(id)) console.warn('Duplicate card in deck "' + key + '": ' + c.es + ' — both copies share progress.');
    CARD_IDS.add(id);
    LEGACY_IDS[key + ':' + li + ':' + ci] = id;
    if(c.was) LEGACY_IDS[cardId(key, {es: c.was})] = id;
  }));
});

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
function speak(text){
  if(!('speechSynthesis' in window)) return;
  text = text.replace(/\s*\/\s*/g, ', '); // "orgulloso / orgullosa" -> read both with a pause, not "slash"
  if(!voices.length) loadVoices();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'es-MX';
  const mx = voices.find(v => v.lang === 'es-MX' || v.lang === 'es_MX') || voices.find(v => v.lang && v.lang.startsWith('es'));
  if(mx) u.voice = mx;
  u.rate = level().speechRate; // slower on Fácil, natural speed on Difícil
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

// Returns true when a correct answer came before the card was due, so its
// schedule didn't change (practice rounds).
// qtype: which quiz question type was asked (quiz.js), or undefined for flashcards.
function recordAnswer(id, correct, qtype){
  const before = cardRecord(id);
  const after = SRS.answer(before, correct, Date.now());
  const early = after === before;
  if(!early){ state.progress[id] = after; saveProgress(); }
  if(correct){ state.correctTotal++; saveCorrectTotal(); }
  const was = state.unlocked[state.deck] || 1;
  const reached = unlockProgress(state.deck);
  if(reached > was){
    state.unlocked[state.deck] = reached;
    saveUnlocked();
    state.levelUp = { deck: state.deck, to: reached - 1 }; // index of the new level, or levels.length = deck finished
  }

  // challenges: every answer counts toward the day streak and today's challenges
  const now = Date.now();
  Challenges.recordAnswer(state.stats, { deck: state.deck, correct, mode: state.mode, qtype, difficulty: state.difficulty, now });
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
  Object.keys(DECKS).forEach(key => { out[key] = DECKS[key].name; });
  return out;
}
function achievementContext(){
  const keys = Object.keys(DECKS);
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
  el.innerHTML = items.map(i => i.kind === 'daily'
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
function selectDeck(key){ state.deck = key; state.levelUp = null; startSession(false); }
function selectLevel(deckKey, levelIdx){
  if(levelIdx === ALL ? !isDeckFinished(deckKey) : levelIdx >= unlockedLevelCount(deckKey)) return;
  state.levelByDeck[deckKey] = levelIdx;
  state.levelUp = null;
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
      : 'Level ' + (lvl+1) + ' of ' + d.levels.length;
    const btn = document.createElement('button');
    btn.className = 'deck-btn' + (state.deck === key ? ' active' : '');
    btn.setAttribute('aria-pressed', state.deck === key ? 'true' : 'false');
    btn.innerHTML =
      (mastered ? '<div class="mastered-badge" aria-hidden="true">✨</div>' : '') +
      iconSvg(d.icon, 'deck-icon-svg') +
      '<div class="deck-name">' + esc(d.name) + '</div>' +
      '<div class="deck-level">' + label + '</div>' +
      '<div class="deck-progress">' + totals.known + '/' + totals.total + ' known</div>' +
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
  if(state.practice){
    html += '<div class="practice-banner">Practice round: includes cards that aren’t due yet. Those only move up once they’re due, so this won’t rush the schedule. ' +
      '<button class="link-btn" id="exitPracticeBtn">Back to due cards</button></div>';
  }
  el.innerHTML = html;
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
        (level().showPron ? '<div class="card-sub" style="opacity:0.75;font-style:italic;">' + esc(card.pron) + '</div>' : '') +
        '<div class="card-hint">tap to reveal</div>' +
      '</div>' +
      '<div class="face face-back">' +
        '<button class="sound-btn" id="soundBtnBack" title="Hear it" aria-label="Hear it">' + SPEAKER_SVG + '</button>' +
        iconSvg(card.icon) +
        '<div class="card-word" style="font-size:20px;">' + esc(card.en) + '</div>' +
        '<div class="card-sub">' + esc(card.es) + ' · ' + esc(card.pron) + '</div>' +
      '</div>' +
    '</div></div>' +
    '<div class="card-controls">' +
      '<button class="ctrl-btn" id="skipBtn">Not yet</button>' +
      '<button class="ctrl-btn good" id="knowBtn">I know this</button>' +
    '</div>' +
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
  const incoming = cleanProgress(payload.progress);
  if(!Object.keys(incoming).length) throw new Error('no usable progress');

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
    const blob = encodeProgressBlob({ version: 2, progress: state.progress, unlocked: state.unlocked, streak: state.correctTotal, challenges: state.stats, exportedAt: Date.now() });
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
document.getElementById('exportBtn').onclick = () => { state.syncPanel = state.syncPanel === 'export' ? null : 'export'; renderSync(); };
document.getElementById('importBtn').onclick = () => { state.syncPanel = state.syncPanel === 'import' ? null : 'import'; renderSync(); };

(async function init(){
  if('speechSynthesis' in window){
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices; // voices load asynchronously in most browsers
  }
  // Shows the welcome / "who's practising?" / PIN screen as needed, then loads that profile.
  await Profiles.start(async () => {
    state = freshState();
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
