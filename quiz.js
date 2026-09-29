// quiz.js — the quiz question types.
// "Mixed" picks harder types as a card gets stronger: new cards are recognised
// (Spanish → English); known ones are reversed, listened to, gap-filled or
// used in a situation; strong ones are typed, built word by word or said out
// loud. "Match the pairs" is a warm-up game that doesn't touch the schedule.
// Uses app.js helpers (state, esc, recordAnswer, hearCard, speak, nextCard,
// stripNote, meaningsOverlap, shuffled, cardRecord, dueLabel, …) at call time,
// so it only defines functions and must load before app.js runs.

const QUIZ_TYPES = [
  ['mixed', 'Mixed — gets harder as you learn'],
  ['recognize', 'Spanish → English'],
  ['reverse', 'English → Spanish'],
  ['listen', 'Listening'],
  ['type', 'Type it'],
  ['gap', 'Fill the gap'],
  ['build', 'Build the phrase'],
  ['scenario', 'What would you say?'],
  ['speak', 'Say it out loud (experimental)'],
  ['match', 'Match the pairs (game)'],
];
const QUIZ_TYPE_IDS = QUIZ_TYPES.map(t => t[0]);

// Difficulty changes how questions are asked, never how often cards come back.
// tiers: the question types Mixed uses for a card in box 0, box 1, boxes 2-3, and box 4+.
const DIFFICULTY = {
  easy: {
    label: 'Fácil', en: 'Easy', blurb: 'Pronunciation shown \u00b7 3 choices \u00b7 slower audio \u00b7 spelling forgiven',
    choices: 3, speechRate: 0.75, typos: len => len >= 8 ? 3 : len >= 4 ? 2 : 1, accentsCount: false,
    showPron: true, decoys: 0, matchPairs: 4,
    tiers: [['recognize'], ['recognize', 'listen'], ['recognize', 'reverse', 'listen', 'gap', 'scenario'], ['reverse', 'listen', 'gap', 'scenario', 'build']],
  },
  normal: {
    label: 'Normal', en: 'Normal', blurb: 'Pronunciation shown \u00b7 4 choices \u00b7 accents and small typos forgiven',
    choices: 4, speechRate: 0.92, typos: len => len >= 8 ? 2 : len >= 4 ? 1 : 0, accentsCount: false,
    showPron: true, decoys: 0, matchPairs: 5,
    tiers: [['recognize'], ['recognize', 'reverse', 'listen'], ['reverse', 'listen', 'gap', 'scenario', 'build'], ['type', 'build', 'scenario', 'gap', 'listen']],
  },
  hard: {
    label: 'Difícil', en: 'Hard', blurb: 'No pronunciation hints \u00b7 5 choices \u00b7 natural-speed audio \u00b7 accents and spelling must be right',
    choices: 5, speechRate: 1.0, typos: () => 0, accentsCount: true,
    showPron: false, decoys: 2, matchPairs: 6,
    tiers: [['recognize', 'reverse'], ['reverse', 'listen', 'gap'], ['type', 'build', 'scenario', 'listen'], ['type', 'build', 'scenario']],
  },
};
const DIFFICULTY_IDS = Object.keys(DIFFICULTY);
const level = () => DIFFICULTY[state.difficulty] || DIFFICULTY.normal;

const canHear = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
const Recognition = () => (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;

// ---- text helpers ----
const PUNCT = /[¿¡?!.,;:…"“”()]/g;
// For comparing answers: no accents, no punctuation, lower case ("¿Qué tal?" -> "que tal").
function plainText(s){ return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(PUNCT, ' ').replace(/\s+/g, ' ').trim(); }
// Same, but keeping accents — to tell someone their accents were off.
function tidyText(s){ return String(s).normalize('NFC').toLowerCase().replace(PUNCT, ' ').replace(/\s+/g, ' ').trim(); }

function editDistance(a, b){
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for(let i = 1; i <= a.length; i++){
    let diag = prev[0];
    prev[0] = i;
    for(let j = 1; j <= b.length; j++){
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// Both forms of a gendered card, spelled out in full:
// "Estoy orgulloso / orgullosa de ti" -> ["Estoy orgulloso de ti", "Estoy orgullosa de ti"]
// "Mi esposo / Mi esposa"             -> ["Mi esposo", "Mi esposa"]
function spanishVariants(es){
  const parts = es.split(' / ');
  if(parts.length !== 2) return [es];
  const [left, right] = parts;
  const lw = left.split(' '), rw = right.split(' ');
  if(plainText(lw[0]) === plainText(rw[0]) && lw.length > 1) return [left, right];
  return [lw.concat(rw.slice(1)).join(' '), lw.slice(0, -1).concat(rw).join(' ')].map(s => s.trim());
}

// Typed or spoken answer vs the card. Punctuation never matters; how many typos
// are forgiven, and whether accents count, depend on the difficulty.
function checkAnswer(input, card, diff){
  const d = diff || level();
  const said = plainText(input);
  if(!said) return { ok: false };
  let best = null;
  spanishVariants(card.es).forEach(v => {
    const target = plainText(v);
    const dist = editDistance(said, target);
    if(!best || dist < best.dist) best = { v, target, dist };
  });
  const allowed = d.typos(best.target.length);
  if(best.dist === 0){
    const accentsRight = tidyText(input) === tidyText(best.v);
    if(accentsRight) return { ok: true, note: '' };
    if(d.accentsCount) return { ok: false, note: 'So close \u2014 on Difícil the accents count: ' + best.v };
    return { ok: true, note: 'Right! With its accents it\u2019s written: ' + best.v };
  }
  if(best.dist <= allowed) return { ok: true, note: 'Close enough! It\u2019s spelled: ' + best.v };
  return { ok: false, similarity: 1 - best.dist / Math.max(best.target.length, said.length) };
}

// ---- which cards suit which type ----
function gapData(card, pool){
  if(card.es.includes(' / ')) return null;
  const words = card.es.split(' ');
  if(words.length < 2) return null;
  const candidates = words.map((w, i) => ({ i, plain: plainText(w) })).filter(c => c.plain.length >= 3);
  if(!candidates.length) return null;
  const longest = Math.max.apply(null, candidates.map(c => c.plain.length));
  const pick = shuffled(candidates.filter(c => c.plain.length >= longest - 1))[0];
  const token = words[pick.i];
  const answer = token.replace(PUNCT, '');
  const display = words.map((w, i) => i === pick.i ? w.replace(answer, '<span class="gap-blank">____</span>') : esc(w)).join(' ');
  const seen = new Set([pick.plain]);
  const distractors = [];
  shuffled(pool.filter(c => c !== card)).forEach(c => {
    c.es.split(' ').forEach(w => {
      const bare = w.replace(PUNCT, ''), p = plainText(bare);
      if(distractors.length < 3 && p.length >= 3 && !seen.has(p) && !bare.includes('/')){ seen.add(p); distractors.push(bare); }
    });
  });
  if(distractors.length < 2) return null;
  return { display, answer, options: shuffled([answer].concat(distractors)) };
}

function buildWords(card){
  if(card.es.includes(' / ')) return null;
  const words = card.es.replace(PUNCT, ' ').split(/\s+/).filter(Boolean);
  return words.length >= 3 && words.length <= 9 ? words : null;
}

function canUseType(type, card, pool){
  switch(type){
    case 'listen': return canHear();
    case 'speak': return !!Recognition();
    case 'gap': return !!gapData(card, pool);
    case 'build': return !!buildWords(card);
    case 'scenario': return !!card.ctx;
    default: return true;
  }
}

// Mixed mode: harder question types as a card moves up the boxes.
function pickQuizType(card, pool){
  const chosen = state.quizType;
  if(chosen !== 'mixed') return canUseType(chosen, card, pool) ? chosen : 'recognize';
  const box = cardRecord(card._id).box;
  const tiers = level().tiers;
  let tier = box === 0 ? tiers[0] : box === 1 ? tiers[1] : box <= 3 ? tiers[2] : tiers[3];
  if(box >= 2 && state.speakInMix) tier = tier.concat(['speak']);
  const usable = tier.filter(t => canUseType(t, card, pool));
  return usable.length ? shuffled(usable)[0] : 'recognize';
}

// Small decks (e.g. My phrases) borrow wrong options from the other decks.
function choicePool(cards){
  if(cards.length >= level().choices + 2) return cards;
  return cards.concat(BUILT_IN_DECKS.reduce((all, k) => all.concat(deckCards(k)), []).filter(c => !cards.some(x => x.es === c.es)));
}

// Wrong options (2-4, by difficulty) whose meaning doesn't overlap the right one.
function distractorCards(card, pool){
  const out = [], want = level().choices - 1;
  shuffled(pool.filter(c => c !== card)).forEach(c => {
    if(out.length >= want || c.es === card.es || stripNote(c.en) === stripNote(card.en)) return;
    if(meaningsOverlap(c.en, card.en) || out.some(o => meaningsOverlap(o.en, c.en))) return;
    out.push(c);
  });
  return out;
}

// ---- rendering ----
const PROMPTS = {
  recognize: 'What does this mean?',
  reverse: 'How do you say this in Spanish?',
  listen: 'Listen — what does it mean?',
  type: 'Type it in Spanish',
  gap: 'Fill the gap',
  build: 'Put the words in order',
  scenario: 'What would you say?',
  speak: 'Say it in Spanish',
};

function quizSoundButton(id){
  return '<button class="sound-btn quiz-sound-btn" id="' + id + '" title="Hear it" aria-label="Hear it">' + SPEAKER_SVG + '</button>';
}

function renderQuestion(type, card, cardIdx, cards){
  const stage = document.getElementById('stage');
  const head = '<div class="quiz-prompt">' + PROMPTS[type] + ' <span style="opacity:0.6;">(' + dueLabel(card._id) + ')</span></div>';
  const english = '<div class="quiz-en">' + esc(stripNote(card.en)) + '</div>';
  const spanishWord = '<div class="quiz-word">' + esc(card.es) + ' ' + quizSoundButton('quizSoundBtn') + '</div>' +
    (level().showPron && card.pron ? '<div class="card-sub" style="opacity:0.55;font-style:italic;margin-top:2px;">' + esc(card.pron) + '</div>' : '');
  let body = '', after = null;

  if(type === 'recognize' || type === 'listen' || type === 'reverse' || type === 'scenario'){
    const toSpanish = type === 'reverse' || type === 'scenario';
    const optText = c => toSpanish ? c.es : stripNote(c.en);
    const options = shuffled([card].concat(distractorCards(card, choicePool(cards))));
    if(type === 'recognize') body = iconSvg(card.icon, 'quiz-icon-svg') + spanishWord;
    else if(type === 'listen') body = '<button class="listen-big" id="listenBtn">' + SPEAKER_SVG + '<span>Tap to hear it</span></button>';
    else if(type === 'reverse') body = iconSvg(card.icon, 'quiz-icon-svg') + english;
    else body = '<div class="quiz-scenario">' + esc(card.ctx) + '</div>';
    body += '<div class="options" id="optsWrap">' + options.map((c, i) =>
      '<button class="opt-btn" data-i="' + i + '">' + esc(optText(c)) + '</button>').join('') + '</div>';
    after = () => {
      if(type === 'listen'){ const play = () => hearCard(card.es); document.getElementById('listenBtn').onclick = play; speak(card.es); }
      if(type === 'recognize') document.getElementById('quizSoundBtn').onclick = () => hearCard(card.es);
      document.querySelectorAll('#optsWrap .opt-btn').forEach(b => {
        b.onclick = () => {
          if(state.quizAnswered) return;
          const chosen = options[+b.dataset.i];
          document.querySelectorAll('#optsWrap .opt-btn').forEach(o => {
            o.disabled = true;
            const c = options[+o.dataset.i];
            if(c === card) o.classList.add('correct'); else if(o === b) o.classList.add('wrong');
          });
          finishQuestion(type, card, chosen === card, []);
        };
      });
    };
  }

  else if(type === 'type' || type === 'speak'){
    body = iconSvg(card.icon, 'quiz-icon-svg') + english;
    if(type === 'type'){
      body += '<input class="type-input" id="typeInput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" lang="es" placeholder="Escribe aquí… (type here)">' +
        '<div class="quiz-row"><button class="ctrl-btn" id="dontKnowBtn">I don’t know</button><button class="ctrl-btn primary" id="checkBtn">Check</button></div>';
      after = () => {
        const input = document.getElementById('typeInput');
        const check = () => {
          if(state.quizAnswered || !input.value.trim()) return;
          const res = checkAnswer(input.value, card);
          input.disabled = true;
          input.classList.add(res.ok ? 'correct' : 'wrong');
          finishQuestion(type, card, res.ok, res.note ? [res.note] : []);
        };
        document.getElementById('checkBtn').onclick = check;
        // preventDefault: otherwise the same Enter press also "clicks" the Next button that gets focus.
        input.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); check(); } };
        document.getElementById('dontKnowBtn').onclick = () => { if(!state.quizAnswered){ input.disabled = true; finishQuestion(type, card, false, []); } };
        input.focus();
      };
    } else {
      body += '<button class="mic-btn" id="micBtn"><span class="mic-dot"></span><span id="micLabel">Tap, then say it</span></button>' +
        '<div class="quiz-note" id="heardNote" role="status"></div>' +
        '<div class="quiz-row"><button class="ctrl-btn" id="skipSpeakBtn">Can’t talk right now</button></div>';
      after = () => wireSpeaking(card);
    }
  }

  else if(type === 'gap'){
    const g = gapData(card, cards);
    body = '<div class="quiz-word gap-line">' + g.display + '</div>' + english +
      '<div class="options options-row" id="optsWrap">' + g.options.map((w, i) =>
        '<button class="opt-btn" data-i="' + i + '">' + esc(w) + '</button>').join('') + '</div>';
    after = () => document.querySelectorAll('#optsWrap .opt-btn').forEach(b => {
      b.onclick = () => {
        if(state.quizAnswered) return;
        const ok = plainText(g.options[+b.dataset.i]) === plainText(g.answer);
        document.querySelectorAll('#optsWrap .opt-btn').forEach(o => {
          o.disabled = true;
          if(plainText(g.options[+o.dataset.i]) === plainText(g.answer)) o.classList.add('correct'); else if(o === b) o.classList.add('wrong');
        });
        finishQuestion(type, card, ok, []);
      };
    });
  }

  else if(type === 'build'){
    const words = buildWords(card);
    let tiles = shuffled(words.map((w, i) => ({ w, i })).concat(decoyWords(card, words, cards)));
    if(tiles.every((t, i) => t.i === i)) tiles = tiles.slice(1).concat(tiles[0]);
    body = english + '<div class="build-answer" id="buildAnswer" aria-label="Your answer"></div>' +
      '<div class="build-tiles" id="buildTiles"></div>' +
      '<div class="quiz-row"><button class="ctrl-btn" id="clearBtn">Clear</button><button class="ctrl-btn primary" id="checkBtn" disabled>Check</button></div>';
    after = () => wireBuild(card, words, tiles);
  }

  stage.innerHTML = head + body;
  if(after) after();
}

// Difícil mixes in words from other phrases that don't belong.
function decoyWords(card, words, pool){
  const have = new Set(words.map(plainText)), out = [];
  shuffled(pool.filter(c => c !== card && !c.es.includes(' / '))).forEach(c => {
    c.es.replace(PUNCT, ' ').split(/\s+/).filter(Boolean).forEach(w => {
      if(out.length < level().decoys && !have.has(plainText(w)) && plainText(w).length >= 2){ have.add(plainText(w)); out.push({ w, i: -1 }); }
    });
  });
  return out;
}

function wireBuild(card, words, tiles){
  const placed = [];
  const answerEl = document.getElementById('buildAnswer'), tilesEl = document.getElementById('buildTiles');
  const checkBtn = document.getElementById('checkBtn');
  const draw = () => {
    answerEl.innerHTML = placed.map((t, k) => '<button class="tile placed" data-k="' + k + '">' + esc(t.w) + '</button>').join('');
    tilesEl.innerHTML = tiles.map((t, k) => placed.includes(t) ? '<span class="tile ghost">' + esc(t.w) + '</span>'
      : '<button class="tile" data-k="' + k + '">' + esc(t.w) + '</button>').join('');
    checkBtn.disabled = placed.length !== words.length || state.quizAnswered;
    if(state.quizAnswered) return;
    tilesEl.querySelectorAll('button.tile').forEach(b => { b.onclick = () => { placed.push(tiles[+b.dataset.k]); draw(); }; });
    answerEl.querySelectorAll('button.tile').forEach(b => { b.onclick = () => { placed.splice(+b.dataset.k, 1); draw(); }; });
  };
  document.getElementById('clearBtn').onclick = () => { if(!state.quizAnswered){ placed.length = 0; draw(); } };
  checkBtn.onclick = () => {
    if(state.quizAnswered) return;
    const ok = placed.map(t => plainText(t.w)).join(' ') === words.map(plainText).join(' ');
    answerEl.classList.add(ok ? 'correct' : 'wrong');
    finishQuestion('build', card, ok, []);
    draw();
  };
  draw();
}

function wireSpeaking(card){
  const Rec = Recognition();
  const btn = document.getElementById('micBtn'), label = document.getElementById('micLabel'), heard = document.getElementById('heardNote');
  let attempts = 0, listening = false;
  // Can't talk: ask this card a different way instead (nothing recorded yet).
  document.getElementById('skipSpeakBtn').onclick = () => { if(!state.quizAnswered){ state.q.type = 'recognize'; renderStage(); } };
  btn.onclick = () => {
    if(state.quizAnswered || listening) return;
    let rec;
    try{ rec = new Rec(); }catch(e){ heard.textContent = 'Speech recognition isn’t available here.'; return; }
    rec.lang = 'es-MX';
    rec.maxAlternatives = 3;
    rec.interimResults = false;
    listening = true;
    btn.classList.add('listening');
    label.textContent = 'Listening…';
    rec.onresult = e => {
      const alts = Array.from(e.results[0] || []).map(a => a.transcript);
      // Speech recognition mishears a little, so speaking is never judged more strictly than Normal.
      const results = alts.map(t => ({ t, r: checkAnswer(t, card, state.difficulty === 'easy' ? DIFFICULTY.easy : DIFFICULTY.normal) }));
      const hit = results.find(x => x.r.ok);
      attempts++;
      if(hit){ heard.textContent = 'I heard: “' + hit.t + '”'; finishQuestion('speak', card, true, []); return; }
      heard.textContent = 'I heard: “' + (alts[0] || '…') + '” — not quite.' + (attempts < 3 ? ' Try again, or tap “Show me”.' : '');
      if(attempts >= 3) finishQuestion('speak', card, false, []);
      else if(!document.getElementById('giveUpBtn')){
        const give = document.createElement('button');
        give.className = 'ctrl-btn';
        give.id = 'giveUpBtn';
        give.textContent = 'Show me';
        give.onclick = () => { if(!state.quizAnswered) finishQuestion('speak', card, false, []); };
        document.querySelector('.quiz-row').appendChild(give);
      }
    };
    rec.onerror = e => {
      heard.textContent = e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'The microphone is blocked. Allow it in your settings, or pick another question type.'
        : 'I didn’t catch that. Tap and try again.';
    };
    rec.onend = () => { listening = false; btn.classList.remove('listening'); label.textContent = 'Tap, then say it'; };
    try{ rec.start(); }catch(e){ listening = false; }
  };
}

// Shared ending for every type: record it, reveal the phrase, offer "Next".
function finishQuestion(type, card, isCorrect, notes){
  if(state.quizAnswered) return;
  state.quizAnswered = true;
  const stage = document.getElementById('stage');
  document.querySelectorAll('#stage .quiz-row button').forEach(b => { if(b.id !== 'checkBtn') b.disabled = true; });
  if(isCorrect) state.correctCount++;
  const early = recordAnswer(card._id, isCorrect, type);
  const lines = notes.slice();
  if(type === 'recognize'){ if(stripNote(card.en) !== card.en) lines.push(card.en); }
  if(early) lines.push('Not due yet, so its schedule didn’t change.');
  if(type !== 'recognize'){
    const reveal = document.createElement('div');
    reveal.className = 'quiz-reveal ' + (isCorrect ? 'good' : 'bad');
    reveal.innerHTML = '<div class="reveal-head">' + (isCorrect ? '✓ Correct' : 'The answer:') + '</div>' +
      '<div class="reveal-es">' + esc(card.es) + ' ' + quizSoundButton('revealSoundBtn') + '</div>' +
      '<div class="reveal-sub">' + (card.pron ? esc(card.pron) + ' · ' : '') + esc(card.en) + '</div>' +
      (card.why ? '<div class="reveal-why"><b>Why?</b> ' + esc(card.why) + '</div>' : '');
    stage.appendChild(reveal);
    document.getElementById('revealSoundBtn').onclick = () => hearCard(card.es);
  }
  lines.forEach(text => {
    const note = document.createElement('div');
    note.className = 'quiz-note';
    note.textContent = text;
    stage.appendChild(note);
  });
  const next = document.createElement('button');
  next.className = 'ctrl-btn primary quiz-next';
  next.textContent = state.idx + 1 >= state.order.length ? 'See results' : 'Next';
  next.onclick = nextCard;
  stage.appendChild(next);
  next.focus();
  renderDecks(); renderLevelChips(); renderStats(); renderGreeting();
}

// ---- Match the pairs: a timed warm-up. Doesn't change the review schedule. ----
function renderMatch(){
  const stage = document.getElementById('stage');
  const picked = [];
  shuffled(activeCards()).forEach(c => {
    if(picked.length < level().matchPairs && !picked.some(p => p.es === c.es || meaningsOverlap(p.en, c.en))) picked.push(c);
  });
  if(picked.length < 3){ stage.innerHTML = '<div class="done"><p>Not enough phrases here for a match game.</p></div>'; return; }
  const left = shuffled(picked), right = shuffled(picked);
  let selected = null, matched = 0, mistakes = 0, started = 0;
  stage.innerHTML =
    '<div class="quiz-prompt">Match each Spanish phrase to its meaning <span class="match-timer" id="matchTimer">0s</span></div>' +
    '<div class="match-grid">' +
      '<div class="match-col">' + left.map((c, i) => '<button class="match-tile es" data-side="es" data-i="' + i + '">' + esc(c.es) + '</button>').join('') + '</div>' +
      '<div class="match-col">' + right.map((c, i) => '<button class="match-tile" data-side="en" data-i="' + i + '">' + esc(stripNote(c.en)) + '</button>').join('') + '</div>' +
    '</div>' +
    '<div class="quiz-note">A quick warm-up — it doesn’t change when cards come back.</div>';
  const timerEl = document.getElementById('matchTimer');
  const tick = setInterval(() => {
    if(!document.body.contains(timerEl)){ clearInterval(tick); return; }
    if(started) timerEl.textContent = Math.floor((Date.now() - started) / 1000) + 's';
  }, 250);
  const cardOf = b => (b.dataset.side === 'es' ? left : right)[+b.dataset.i];
  stage.querySelectorAll('.match-tile').forEach(b => {
    b.onclick = () => {
      if(b.disabled) return;
      if(!started) started = Date.now();
      if(!selected || selected.dataset.side === b.dataset.side){
        if(selected) selected.classList.remove('selected');
        selected = b;
        b.classList.add('selected');
        return;
      }
      const a = selected;
      selected = null;
      a.classList.remove('selected');
      if(cardOf(a) === cardOf(b)){
        [a, b].forEach(t => { t.disabled = true; t.classList.add('matched'); });
        speak(cardOf(a).es);
        if(++matched === picked.length) finishMatch(Math.max(1, Math.round((Date.now() - started) / 1000)), mistakes, tick);
      } else {
        mistakes++;
        [a, b].forEach(t => { t.classList.add('nope'); setTimeout(() => t.classList.remove('nope'), 450); });
      }
    };
  });
}

function finishMatch(seconds, mistakes, tick){
  clearInterval(tick);
  const best = state.stats.bestMatch;
  Challenges.recordMatch(state.stats, Date.now(), seconds);
  afterChallengeEvent();
  const stage = document.getElementById('stage');
  const record = !best || seconds < best;
  stage.insertAdjacentHTML('beforeend',
    '<div class="done match-done"><h2>' + esc(withName('¡Listo!')) + '</h2>' +
    '<p>All pairs in ' + seconds + 's' + (mistakes ? ' with ' + mistakes + ' mistake' + (mistakes === 1 ? '' : 's') : ' with no mistakes') + '.' +
    (record ? ' That’s your best time!' : ' Best: ' + best + 's.') + '</p>' +
    '<button class="ctrl-btn primary end-btn" id="matchAgainBtn">Play again</button></div>');
  document.getElementById('matchAgainBtn').onclick = () => render();
}

// Difficulty picker, shown in both Flashcards and Quiz.
function renderDifficulty(){
  const el = document.getElementById('difficulty');
  const d = level();
  el.innerHTML =
    '<div class="difficulty" role="radiogroup" aria-label="Difficulty">' +
      '<span class="difficulty-label">Nivel</span>' +
      DIFFICULTY_IDS.map(id => '<button class="diff-btn' + (id === state.difficulty ? ' active' : '') + '" role="radio" aria-checked="' + (id === state.difficulty) +
        '" data-diff="' + id + '">' + DIFFICULTY[id].label + '</button>').join('') +
    '</div>' +
    '<div class="difficulty-blurb">' + d.en + ': ' + d.blurb + '</div>';
  el.querySelectorAll('.diff-btn').forEach(b => {
    b.onclick = () => {
      if(b.dataset.diff === state.difficulty) return;
      state.difficulty = b.dataset.diff;
      savePrefs();
      startSession(state.practice);
    };
  });
}

// The quiz-type picker shown above the quiz.
function renderQuizOptions(){
  const el = document.getElementById('quizOptions');
  if(state.mode !== 'quiz'){ el.innerHTML = ''; return; }
  const types = QUIZ_TYPES.filter(([id]) => id !== 'speak' || Recognition()).filter(([id]) => id !== 'listen' || canHear());
  el.innerHTML =
    '<label class="quiz-type"><span>Questions</span><select id="quizTypeSelect">' +
      types.map(([id, label]) => '<option value="' + id + '"' + (id === state.quizType ? ' selected' : '') + '>' + label + '</option>').join('') +
    '</select></label>' +
    (Recognition() && state.quizType === 'mixed'
      ? '<label class="check speak-toggle"><input type="checkbox" id="speakToggle"' + (state.speakInMix ? ' checked' : '') + '> Include speaking questions (uses the microphone)</label>' : '');
  document.getElementById('quizTypeSelect').onchange = e => {
    state.quizType = e.target.value;
    savePrefs();
    startSession(false);
  };
  const toggle = document.getElementById('speakToggle');
  if(toggle) toggle.onchange = () => { state.speakInMix = toggle.checked; savePrefs(); };
}
