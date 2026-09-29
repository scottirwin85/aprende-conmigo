// challenges.js — daily challenges, the day streak and achievements.
// Pure bookkeeping on a plain `stats` object; app.js records events into it,
// saves it, and renders the results.
const Challenges = (function () {
  const KEEP_DAYS = 30; // daily records older than this are pruned
  // Question types counted by "De todo un poco" (speaking is optional, so not required).
  const QUIZ_KINDS = ['recognize', 'reverse', 'listen', 'type', 'gap', 'build', 'scenario'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // Local calendar day, e.g. "2026-09-29".
  function dayKey(t) {
    const d = new Date(t);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function addDays(key, n) {
    const p = key.split('-').map(Number);
    return dayKey(new Date(p[0], p[1] - 1, p[2] + n).getTime());
  }

  function blankDay() {
    return { answered: 0, correct: 0, listened: 0, flipped: 0, run: 0, bestRun: 0,
             cleared: 0, perfect: 0, matched: 0, convos: 0, deckAnswers: {}, deckCorrect: {}, byType: {}, done: {}, allDone: false };
  }
  function blankStats() {
    return { days: {}, streak: 0, bestStreak: 0, lastDay: null, bestRun: 0,
             listenedTotal: 0, dailyDoneDays: 0, early: false, late: false, earned: {},
             typedTotal: 0, spokenTotal: 0, matchGames: 0, bestMatch: 0, typesDone: {}, hardCorrect: 0, convosDone: {} };
  }

  // ---- daily challenges ----
  // `value(day, deckKey)` reads today's record; three are picked per day.
  const DAILY = [
    { id: 'correct10', group: 'correct', target: 10, text: () => 'Get 10 answers right', value: d => d.correct },
    { id: 'correct20', group: 'correct', target: 20, text: () => 'Get 20 answers right', value: d => d.correct },
    { id: 'listen5', target: 5, text: () => 'Tap the speaker to hear 5 phrases', value: d => d.listened },
    { id: 'flip10', target: 10, text: () => 'Flip 10 flashcards', value: d => d.flipped },
    { id: 'run5', target: 5, text: () => 'Get 5 quiz answers right in a row', value: d => d.bestRun },
    { id: 'decks2', target: 2, text: () => 'Practise two different decks', value: d => Object.keys(d.deckAnswers).length },
    { id: 'clear', target: 1, text: () => 'Clear everything that’s due in a level', value: d => d.cleared },
    { id: 'perfect', target: 1, text: () => 'Finish a quiz round of 5+ with no mistakes', value: d => d.perfect },
    { id: 'deck5', target: 5, text: name => 'Get 5 right in ' + name, value: (d, deck) => d.deckCorrect[deck] || 0 },
    { id: 'type5', target: 5, text: () => 'Type 5 phrases from memory (Quiz \u2192 Type it)', value: d => d.byType.type || 0 },
    { id: 'hear5', target: 5, text: () => 'Get 5 listening questions right', value: d => d.byType.listen || 0 },
    { id: 'build3', target: 3, text: () => 'Build 3 phrases word by word', value: d => d.byType.build || 0 },
    { id: 'scene3', target: 3, text: () => 'Answer 3 \u201cWhat would you say?\u201d questions', value: d => d.byType.scenario || 0 },
    { id: 'convo1', target: 1, text: () => 'Read and listen to a conversation (Conversations tab)', value: d => d.convos },
    { id: 'match1', target: 1, text: () => 'Finish a Match the pairs game', value: d => d.matched },
  ];

  // Small seeded random generator, so everyone sees the same three challenges on a given day.
  function seeded(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h += 0x6D2B79F5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Today's three: always one "get N right", plus two others. deck5 names a deck.
  function dailyFor(key, deckKeys) {
    const rand = seeded('aprende:' + key);
    const correct = DAILY.filter(c => c.group === 'correct');
    const rest = DAILY.filter(c => !c.group).slice();
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    const deck = deckKeys[Math.floor(rand() * deckKeys.length)];
    return [correct[Math.floor(rand() * correct.length)]].concat(rest.slice(0, 2))
      .map(c => ({ def: c, deck: c.id === 'deck5' ? deck : null }));
  }

  // ---- achievements ----
  // ctx: { stats, known, totalCards, correctTotal, levelUps, decksFinished, deckCount, decksMastered }
  const ACHIEVEMENTS = [
    { id: 'first', icon: 'star', es: 'Primeros pasos', en: 'First steps — get your first answer right', progress: c => [c.correctTotal, 1] },
    { id: 'levelup', icon: 'spiral', es: '¡Subiste de nivel!', en: 'You levelled up — unlock a new level', progress: c => [c.levelUps, 1] },
    { id: 'deck', icon: 'diamond', es: 'Baraja completa', en: 'Full deck — finish every level of a deck', progress: c => [c.decksFinished, 1] },
    { id: 'alldecks', icon: 'sun', es: 'De principio a fin', en: 'Start to finish — finish every level of every deck', progress: c => [c.decksFinished, c.deckCount] },
    { id: 'mastered', icon: 'heart', es: 'Bien aprendido', en: 'Well learned — get a whole deck onto week-long gaps', progress: c => [c.decksMastered, 1] },
    { id: 'known25', icon: 'leaf', es: 'Ya le sabes', en: 'You’ve got it — know 25 phrases', progress: c => [c.known, 25] },
    { id: 'known60', icon: 'bird', es: 'Vas volando', en: 'You’re flying — know 60 phrases', progress: c => [c.known, 60] },
    { id: 'knownall', icon: 'house', es: 'Como en casa', en: 'Right at home — know every phrase in the app', progress: c => [c.known, c.totalCards] },
    { id: 'correct100', icon: 'star', es: 'Cien', en: 'A hundred — 100 correct answers', progress: c => [c.correctTotal, 100] },
    { id: 'correct500', icon: 'star', es: 'Quinientos', en: 'Five hundred — 500 correct answers', progress: c => [c.correctTotal, 500] },
    { id: 'correct1000', icon: 'star', es: 'Mil', en: 'A thousand — 1,000 correct answers', progress: c => [c.correctTotal, 1000] },
    { id: 'streak3', icon: 'chili', es: 'Tres días seguidos', en: 'Three days in a row — practise 3 days running', progress: c => [c.stats.bestStreak, 3] },
    { id: 'streak7', icon: 'chili', es: 'Una semana entera', en: 'A whole week — practise 7 days running', progress: c => [c.stats.bestStreak, 7] },
    { id: 'streak30', icon: 'chili', es: 'Un mes entero', en: 'A whole month — practise 30 days running', progress: c => [c.stats.bestStreak, 30] },
    { id: 'run10', icon: 'wave', es: 'Imparable', en: 'Unstoppable — 10 quiz answers right in a row', progress: c => [c.stats.bestRun, 10] },
    { id: 'listen50', icon: 'flower', es: 'Buen oído', en: 'Good ear — hear 50 phrases', progress: c => [c.stats.listenedTotal, 50] },
    { id: 'early', icon: 'sun', es: 'Al que madruga…', en: 'The early bird… — practise before 7am', progress: c => [c.stats.early ? 1 : 0, 1] },
    { id: 'late', icon: 'moon', es: 'Noche de estudio', en: 'Study night — practise after 10pm', progress: c => [c.stats.late ? 1 : 0, 1] },
    { id: 'daily1', icon: 'diamond', es: 'Reto cumplido', en: 'Challenge met — finish all 3 daily challenges', progress: c => [c.stats.dailyDoneDays, 1] },
    { id: 'daily10', icon: 'diamond', es: 'Diez días de retos', en: 'Ten days of challenges \u2014 finish all 3 on 10 days', progress: c => [c.stats.dailyDoneDays, 10] },
    { id: 'type50', icon: 'leaf', es: 'De memoria', en: 'By heart \u2014 type 50 phrases correctly', progress: c => [c.stats.typedTotal, 50] },
    { id: 'speak10', icon: 'flower', es: '\u00a1Qué bien hablas!', en: 'You speak so well \u2014 say 10 phrases correctly out loud', progress: c => [c.stats.spokenTotal, 10] },
    { id: 'hard50', icon: 'chili', es: 'Modo difícil', en: 'Hard mode \u2014 get 50 answers right on Difícil', progress: c => [c.stats.hardCorrect, 50] },
    { id: 'talk5', icon: 'wave', es: 'Buena plática', en: 'A good chat \u2014 finish 5 conversations', progress: c => [Object.keys(c.stats.convosDone).length, 5] },
    { id: 'match10', icon: 'spiral', es: 'Memoria de elefante', en: 'A memory like an elephant \u2014 finish 10 match games', progress: c => [c.stats.matchGames, 10] },
    { id: 'alltypes', icon: 'sun', es: 'De todo un poco', en: 'A bit of everything \u2014 get every quiz question type right at least once', progress: c => [Object.keys(c.stats.typesDone).length, QUIZ_KINDS.length] },
  ];

  // ---- recording ----
  function today(stats, now) {
    const key = dayKey(now);
    if (!stats.days[key]) {
      stats.days[key] = blankDay();
      const cutoff = addDays(key, -KEEP_DAYS);
      Object.keys(stats.days).forEach(k => { if (k < cutoff) delete stats.days[k]; });
    }
    return stats.days[key];
  }

  // Any answer counts as practising today (for the streak).
  function recordAnswer(stats, ev) {
    const d = today(stats, ev.now);
    const key = dayKey(ev.now);
    if (stats.lastDay !== key) {
      stats.streak = stats.lastDay === addDays(key, -1) ? stats.streak + 1 : 1;
      stats.lastDay = key;
      stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    }
    const hour = new Date(ev.now).getHours();
    if (hour >= 4 && hour < 7) stats.early = true;
    if (hour >= 22 || hour < 4) stats.late = true;

    d.answered++;
    d.deckAnswers[ev.deck] = (d.deckAnswers[ev.deck] || 0) + 1;
    if (ev.correct) {
      d.correct++;
      d.deckCorrect[ev.deck] = (d.deckCorrect[ev.deck] || 0) + 1;
    }
    if (ev.qtype && ev.correct) {
      d.byType[ev.qtype] = (d.byType[ev.qtype] || 0) + 1;
      if (QUIZ_KINDS.includes(ev.qtype)) stats.typesDone[ev.qtype] = true;
      if (ev.qtype === 'type') stats.typedTotal++;
      if (ev.qtype === 'speak') stats.spokenTotal++;
    }
    if (ev.correct && ev.difficulty === 'hard') stats.hardCorrect++;
    if (ev.mode === 'quiz') {
      d.run = ev.correct ? d.run + 1 : 0;
      d.bestRun = Math.max(d.bestRun, d.run);
      stats.bestRun = Math.max(stats.bestRun, d.run);
    }
  }
  function recordListen(stats, now) { today(stats, now).listened++; stats.listenedTotal++; }
  function recordFlip(stats, now) { today(stats, now).flipped++; }
  function recordCleared(stats, now) { today(stats, now).cleared++; }
  function recordPerfect(stats, now) { today(stats, now).perfect++; }
  function recordConvo(stats, now, key) {
    today(stats, now).convos++;
    stats.convosDone[key] = true;
  }
  function recordMatch(stats, now, seconds) {
    today(stats, now).matched++;
    stats.matchGames++;
    stats.bestMatch = stats.bestMatch ? Math.min(stats.bestMatch, seconds) : seconds;
  }

  // The streak as it stands today: it's broken once a whole day is missed.
  function currentStreak(stats, now) {
    const key = dayKey(now);
    return stats.lastDay === key || stats.lastDay === addDays(key, -1) ? stats.streak : 0;
  }

  // Today's challenges with progress, for display.
  function dailyStatus(stats, now, deckNames) {
    const d = stats.days[dayKey(now)] || blankDay();
    return dailyFor(dayKey(now), Object.keys(deckNames)).map(({ def, deck }) => {
      const value = Math.min(def.value(d, deck), def.target);
      return { id: def.id, text: def.text(deck ? deckNames[deck] : ''), value, target: def.target, done: value >= def.target };
    });
  }

  // Marks newly finished challenges and achievements; returns them for a toast.
  function evaluate(stats, ctx, now, deckNames) {
    const fresh = [];
    const key = dayKey(now);
    if (stats.days[key]) {
      const d = stats.days[key];
      const status = dailyStatus(stats, now, deckNames);
      status.forEach(s => { if (s.done && !d.done[s.id]) { d.done[s.id] = true; fresh.push({ kind: 'daily', text: s.text }); } });
      if (!d.allDone && status.every(s => s.done)) { d.allDone = true; stats.dailyDoneDays++; }
    }
    const full = Object.assign({ stats }, ctx);
    ACHIEVEMENTS.forEach(a => {
      if (stats.earned[a.id]) return;
      const p = a.progress(full);
      if (p[0] >= p[1]) { stats.earned[a.id] = now; fresh.push({ kind: 'achievement', text: a.es, en: a.en }); }
    });
    return fresh;
  }

  function achievementStatus(stats, ctx) {
    const full = Object.assign({ stats }, ctx);
    return ACHIEVEMENTS.map(a => {
      const p = a.progress(full);
      return { id: a.id, icon: a.icon, es: a.es, en: a.en, earned: !!stats.earned[a.id],
               value: Math.min(p[0], p[1]), target: p[1] };
    });
  }

  // ---- loading / merging ----
  const nonNeg = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;
  function clean(raw) {
    const s = blankStats();
    if (!raw || typeof raw !== 'object') return s;
    ['streak', 'bestStreak', 'bestRun', 'listenedTotal', 'dailyDoneDays', 'typedTotal', 'spokenTotal', 'matchGames', 'bestMatch', 'hardCorrect']
      .forEach(k => { s[k] = Math.floor(nonNeg(raw[k])); });
    if (raw.convosDone && typeof raw.convosDone === 'object') Object.keys(raw.convosDone).forEach(k => { if (/^[a-z]+\/[a-z0-9]+$/.test(k) && raw.convosDone[k] === true) s.convosDone[k] = true; });
    if (raw.typesDone && typeof raw.typesDone === 'object') QUIZ_KINDS.forEach(t => { if (raw.typesDone[t] === true) s.typesDone[t] = true; });
    s.early = raw.early === true;
    s.late = raw.late === true;
    if (typeof raw.lastDay === 'string' && /^\d{4}-\d\d-\d\d$/.test(raw.lastDay)) s.lastDay = raw.lastDay;
    if (raw.earned && typeof raw.earned === 'object') {
      ACHIEVEMENTS.forEach(a => { if (nonNeg(raw.earned[a.id])) s.earned[a.id] = raw.earned[a.id]; });
    }
    if (raw.days && typeof raw.days === 'object') {
      Object.keys(raw.days).forEach(k => {
        const src = raw.days[k];
        if (!/^\d{4}-\d\d-\d\d$/.test(k) || !src || typeof src !== 'object') return;
        const d = blankDay();
        ['answered', 'correct', 'listened', 'flipped', 'run', 'bestRun', 'cleared', 'perfect', 'matched', 'convos'].forEach(f => { d[f] = Math.floor(nonNeg(src[f])); });
        ['deckAnswers', 'deckCorrect', 'byType'].forEach(f => {
          if (src[f] && typeof src[f] === 'object') Object.keys(src[f]).forEach(deck => { d[f][deck] = Math.floor(nonNeg(src[f][deck])); });
        });
        if (src.done && typeof src.done === 'object') DAILY.forEach(c => { if (src.done[c.id] === true) d.done[c.id] = true; });
        d.allDone = src.allDone === true;
        s.days[k] = d;
      });
    }
    return s;
  }

  // Import from another device: keep the best of both. Today's challenge
  // counts and the running streak stay as they are on this device.
  function merge(local, incoming) {
    const m = clean(local), inc = clean(incoming);
    ['bestStreak', 'bestRun', 'listenedTotal', 'dailyDoneDays', 'typedTotal', 'spokenTotal', 'matchGames', 'hardCorrect'].forEach(k => { m[k] = Math.max(m[k], inc[k]); });
    if (inc.bestMatch) m.bestMatch = m.bestMatch ? Math.min(m.bestMatch, inc.bestMatch) : inc.bestMatch;
    Object.keys(inc.typesDone).forEach(t => { m.typesDone[t] = true; });
    Object.keys(inc.convosDone).forEach(k => { m.convosDone[k] = true; });
    m.early = m.early || inc.early;
    m.late = m.late || inc.late;
    Object.keys(inc.earned).forEach(id => { m.earned[id] = m.earned[id] ? Math.min(m.earned[id], inc.earned[id]) : inc.earned[id]; });
    return m;
  }

  return { dayKey, addDays, blankStats, clean, merge, recordAnswer, recordListen, recordFlip,
           recordCleared, recordPerfect, recordMatch, recordConvo, currentStreak, dailyStatus, evaluate, achievementStatus,
           ACHIEVEMENTS, DAILY };
})();
