// Browser tests for the built app. GitHub runs these on every push, before publishing.
// To run them yourself:
//   npm install && npx playwright install chromium   (once)
//   npm run build && npm test
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const DIST = path.join(__dirname, '..', 'dist');
const URL = 'file://' + path.join(DIST, 'spanish-app.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch();
  // Most tests start signed in as "Sam" — the first profile, which owns the bare storage keys.
  const newCtx = async (seed = true) => {
    const c = await browser.newContext();
    if (seed) await c.addInitScript(() => {
      try {
        if (!localStorage.getItem('profiles')) localStorage.setItem('profiles', JSON.stringify(
          { list: [{ id: 'default', name: 'Sam', color: '#1B6B78', pin: null }], active: 'default' }));
      } catch (e) {}
    });
    return c;
  };
  // After a load or reload, wait until the app has finished starting: either a
  // profile is signed in and drawn, or a sign-in screen is showing.
  const appReady = pg => pg.waitForFunction(() =>
    typeof Profiles !== 'undefined' && document.getElementById('login') &&
    ((Profiles.current() && document.querySelector('#stage').children.length) || !document.getElementById('login').hidden));
  const ctx = await newCtx();
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR', e.message); fails++; });
  await page.clock.install({ time: new Date('2026-09-29T09:00:00') });
  await page.goto(URL);
  const txt = s => page.textContent(s);
  const knowAll = async () => { let n = 0; while (await page.$('#knowBtn')) { await page.click('#knowBtn'); n++; } return n; };

  // 1. first pass: 10 cards, then nothing due
  ok(await page.evaluate(() => state.order.length) === 10, 'first session has 10 cards');
  // flip animation: same element, class toggled
  const h1 = await page.$('#flipCard'); await page.click('.card-word');
  const h2 = await page.$('#flipCard');
  ok(await h1.evaluate((a, b) => a === b, h2) && await h2.evaluate(e => e.classList.contains('flipped')), 'flip toggles class on same element (animates)');
  await page.keyboard.press('Enter'); // focus is on card after click? check keyboard separately
  await h2.focus(); const before = await h2.evaluate(e => e.classList.contains('flipped'));
  await page.keyboard.press(' ');
  ok(await h2.evaluate(e => e.classList.contains('flipped')) !== before, 'space key flips card');
  ok(await knowAll() === 10, 'answered 10');
  ok((await txt('#stage')).includes('due in 10 min') && (await txt('#stage')).includes('Practice anyway'), 'end screen: nothing due, next in 10 min: ' + (await txt('.done p')));
  // 2. practice anyway: early answers don't promote
  await page.click('#practiceBtn');
  ok(await knowAll() === 10, 'practice pass 10 cards');
  ok(await page.evaluate(() => Object.values(state.progress).every(r => r.box === 1)), 'early "I know this" did not promote');
  ok(await page.$eval('.level-chip:nth-child(2)', b => b.disabled), 'level 2 still locked');
  // 3. after 11 minutes cards are due; promote to box 2 -> level up
  await page.clock.fastForward('11:00');
  await page.click('#modeFlash');
  ok(await page.evaluate(() => state.order.length) === 10, '10 due after 11 min');
  // Not yet requeues and demotes
  await page.click('#skipBtn');
  ok(await page.evaluate(() => state.order.length) === 11, 'Not yet requeues card');
  ok(await page.evaluate(() => Object.values(state.progress).some(r => r.box === 0)), 'Not yet demotes');
  await knowAll();
  ok(await page.evaluate(() => Object.values(state.progress).filter(r=>r.box===2).length) === 9, '9 at box 2, demoted one at box 1');
  ok(!(await txt('#stage')).includes('Level up'), 'no level up yet');
  await page.clock.fastForward('11:00'); await page.click('#modeFlash'); await knowAll();
  ok((await txt('#stage')).includes('Level up'), 'level up after spaced answers: ' + (await txt('.done h2')));
  await page.click('#nextLevelBtn');
  ok(await page.evaluate(() => currentLevel('everyday')) === 1, 'moved to level 2');
  // 4. revisit level 1: no bogus level up
  await page.click('.level-chip:nth-child(1)'); await page.click('#practiceBtn').catch(()=>{});
  await knowAll();
  ok(!(await txt('#stage')).includes('Level up'), 'revisiting finished level: no level-up again');
  // 5. demoting level-1 card doesn't relock level 2
  await page.evaluate(() => { recordAnswer(cardId('everyday', DECKS.everyday.levels[0].cards[0]), false); render(); });
  ok(!(await page.$eval('.level-chip:nth-child(2)', b => b.disabled)), 'forgetting a card does not re-lock level 2');

  // 6. quiz mode: level 2 via quiz, overlap check, level up in quiz
  // These quiz checks use the original Spanish -> English questions; the other types are tested further down.
  await page.evaluate(() => { state.quizType = 'recognize'; });
  await page.click('.level-chip:nth-child(2)'); await page.click('#modeQuiz');
  let overlapBad = 0, notesShown = 0;
  const quizPass = async () => { while (await page.$('#optsWrap')) {
    const opts = await page.$$eval('.opt-btn', bs => bs.map(b => b.textContent));
    const correct = await page.evaluate(() => stripNote(activeCards()[state.order[state.idx]].en));
    for (let i=0;i<opts.length;i++) for (let j=i+1;j<opts.length;j++) if (await page.evaluate(([a,b]) => meaningsOverlap(a,b), [opts[i],opts[j]])) overlapBad++;
    if (opts.some(o => o.includes('('))) overlapBad++;
    await page.click(`.opt-btn >> text="${correct}"`);
    if (await page.$('.quiz-note')) notesShown++;
    await page.click('.quiz-next'); } };
  await quizPass(); await page.clock.fastForward('11:00'); await page.click('#modeQuiz'); await quizPass();
  ok((await txt('#stage')).includes('Level up'), 'quiz mode shows level up: ' + (await txt('.done h2')));
  ok(overlapBad === 0, 'no overlapping/hinted quiz options');

  // 7. review-mode quiz across whole everyday deck: chido vs está padre never together
  await page.evaluate(() => {
    const now = Date.now();
    deckCards('everyday').forEach(c => state.progress[c._id] = {box: 2, due: now});
    state.levelUp = null; state.unlocked.everyday = unlockProgress('everyday'); state.levelByDeck = {}; render();
  });
  ok(await page.evaluate(() => isReviewing()), 'deck finished -> review mode');
  ok((await txt('#reviewBanner')).includes('finished every level') && !(await txt('#reviewBanner')).includes('full strength'), 'banner honest when not mastered');
  ok((await txt('.deck-btn.active .deck-level')) === 'All levels · reviewing', 'deck tile label: ' + await txt('.deck-btn.active .deck-level'));
  await page.click('#modeQuiz');
  let pairs = 0;
  for (let k=0;k<200;k++){ const bad = await page.evaluate(() => { const cs = deckCards('everyday'); state.order=[cs.findIndex(c=>c.es==='Chido')]; state.idx=0; renderQuiz();
      const o=[...document.querySelectorAll('.opt-btn')].map(b=>b.textContent); return o.includes("That's cool / awesome"); }); if (bad) pairs++; }
  ok(pairs === 0, 'Chido never shown alongside "That\'s cool / awesome"');
  await page.click('#modeFlash');

  // 8. stats label
  ok(/phrases known · \d+ correct answers/.test(await txt('#streak')), 'stats: ' + await txt('#streak'));

  // 9. export -> import round trip; bad import changes nothing
  await page.click('#exportBtn'); const code = await page.inputValue('#exportBox');
  const snap = await page.evaluate(() => JSON.stringify(state.progress));
  await page.click('#importBtn');
  const bad = await page.evaluate(() => encodeProgressBlob({progress: {'everyday:0:0': {box: 1, due: 5}, 'x': null, '__proto__': {box:4,due:1}}}));
  await page.fill('#importBox', await page.evaluate(() => encodeProgressBlob({progress: {'nope': {box: 99, due: 'x'}}})));
  await page.click('#applyImportBtn');
  ok((await txt('#importNote')).includes('didn’t look right') && await page.evaluate(() => JSON.stringify(state.progress)) === snap, 'invalid import rejected, state unchanged');
  await page.fill('#importBox', 'garbage!!'); await page.click('#applyImportBtn');
  ok(await page.evaluate(() => JSON.stringify(state.progress)) === snap, 'garbage import rejected');
  await page.fill('#importBox', bad); await page.click('#applyImportBtn');
  ok(await page.evaluate(() => Object.getPrototypeOf(state.progress) === Object.prototype && !('x' in state.progress)), 'no prototype pollution / junk ids');

  // 10. legacy localStorage migration + fresh import into new context
  const ctx2 = await newCtx();
  // Old-format progress is in place before the app ever loads (once only, not on later reloads).
  await ctx2.addInitScript(() => {
    if (!localStorage.getItem('seededLegacy')) {
      localStorage.setItem('seededLegacy', '1');
      localStorage.setItem('progress', JSON.stringify({'everyday:0:0': {box: 3, due: 1e15}, 'love:2:9': {box:1, due: 5}}));
      localStorage.setItem('streak', '7');
    }
  });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => { console.log('PAGEERROR2', e.message); fails++; });
  await p2.goto(URL); await appReady(p2);
  await p2.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('progress'))['everyday/¿Qué onda?']; } catch (e) { return false; } });
  const mig = await p2.evaluate(() => JSON.parse(localStorage.getItem('progress')));
  ok(mig['everyday/¿Qué onda?'] && mig['everyday/¿Qué onda?'].box === 3 && mig['love/Para siempre y un día más'], 'legacy positional ids migrated');
  await p2.click('#importBtn'); await p2.fill('#importBox', code); await p2.click('#applyImportBtn');
  ok((await p2.textContent('#syncPanel')).includes('Imported progress for'), 'import success message');
  ok(await p2.evaluate(() => isDeckFinished('everyday')), 'import carries unlocks');

  // 11. Scriptable bridge
  const ctx3 = await newCtx(); const p3 = await ctx3.newPage();
  p3.on('pageerror', e => { console.log('PAGEERROR3', e.message); fails++; });
  const html = fs.readFileSync(path.join(DIST, 'spanish-app.html'), 'utf8').replace('<!--HOST-BOOTSTRAP-->',
    '<script>window.__APRENDE_SCRIPTABLE__={store:{progress: JSON.stringify({"food/Repetir":{box:2,due:1}})}};</script>');
  await p3.addInitScript(() => { window.__saves = []; const o = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
    Object.defineProperty(HTMLIFrameElement.prototype, 'src', { set(v){ window.__saves.push(v); }, get(){ return ''; } }); });
  await p3.route('https://aprende-conmigo.local/', r => r.fulfill({contentType:'text/html', body: html})); await p3.goto('https://aprende-conmigo.local/');
  ok(await p3.evaluate(() => Storage.backend) === 'scriptable', 'scriptable backend detected');
  ok(await p3.evaluate(() => state.progress['food/Repetir'].box) === 2, 'scriptable store loaded');
  await p3.click('#knowBtn'); await p3.waitForTimeout(600);
  const saves = await p3.evaluate(() => window.__saves);
  ok(saves.length >= 1 && saves[0].startsWith('aprendeconmigo://save?') && JSON.parse(decodeURIComponent(saves[0].split('?')[1])).progress, 'save request sent to wrapper (' + saves.length + ')');

  // 12. artifact storage fallback: failing set -> readable via get
  const ctx4 = await newCtx(); const p4 = await ctx4.newPage();
  await p4.addInitScript(() => { window.storage = { get: async () => null, set: async () => { throw new Error('nope'); } }; });
  await p4.goto(URL); await p4.click('#knowBtn'); await p4.waitForTimeout(100);
  ok(await p4.evaluate(async () => Storage.backend === 'artifact' && !!(await Storage.get('progress'))), 'artifact write failure still readable');
  // 13. scheduling: wrong answers drop two boxes, gaps grow to 3 months
  const ctx5 = await newCtx(); const p5 = await ctx5.newPage();
  p5.on('pageerror', e => { console.log('PAGEERROR5', e.message); fails++; });
  await p5.goto(URL);
  const sched = await p5.evaluate(() => {
    const DAY = 864e5, now = Date.now();
    return {
      wrong: SRS.answer({box: 5, due: now - 1}, false, now),
      wrongLow: SRS.answer({box: 1, due: now - 1}, false, now),
      top: SRS.answer({box: 6, due: now - 1}, true, now),
      topAgain: SRS.answer({box: 7, due: now - 1}, true, now),
      early: SRS.answer({box: 3, due: now + DAY}, true, now),
      now, DAY };
  });
  ok(sched.wrong.box === 3 && sched.wrong.due === sched.now, 'wrong answer drops 2 boxes and is due now');
  ok(sched.wrongLow.box === 0, 'wrong answer never goes below box 0');
  ok(sched.top.box === 7 && sched.top.due - sched.now === 90 * sched.DAY, 'box 7 = 3-month gap');
  ok(sched.topAgain.box === 7 && sched.topAgain.due - sched.now === 90 * sched.DAY, 'top box re-extends by 3 months');
  ok(sched.early.box === 3 && sched.early.seen === undefined, 'early correct answer changes nothing');
  ok(await p5.evaluate(() => { const now = Date.now();
    deckCards('food').forEach(c => state.progress[c._id] = {box: 4, due: now + 1e9}); return isDeckMastered('food'); }), 'mastered at a week-long gap (box 4)');

  // 14. import keeps the most recently answered record
  const merged = await p5.evaluate(() => {
    const a = 'love/Mi amor', b = 'love/Te extraño', c = 'love/Mi vida';
    state.progress = {
      [a]: {box: 4, due: 9e12, seen: 1000},   // strong locally, answered long ago
      [b]: {box: 1, due: 9e12, seen: 5000},   // weak locally, answered recently
      [c]: {box: 1, due: 9e12},               // pre-`seen` record
    };
    applyImport(encodeProgressBlob({progress: {
      [a]: {box: 0, due: 1, seen: 2000},      // forgot it on the other device, more recently
      [b]: {box: 5, due: 9e12, seen: 3000},   // older, stronger
      [c]: {box: 3, due: 9e12},               // pre-`seen`, stronger
    }}));
    return [state.progress[a].box, state.progress[b].box, state.progress[c].box];
  });
  ok(merged[0] === 0, 'import: newer forgetting wins over older strong record');
  ok(merged[1] === 1, 'import: local newer record kept over older stronger one');
  ok(merged[2] === 3, 'import: records without timestamps fall back to strongest');

  // 15. practice notice + level-up shown immediately and survives a mode switch
  await p5.evaluate(() => { state.progress = {}; state.unlocked = {}; state.levelByDeck = {}; state.deck = 'everyday'; startSession(false); });
  await p5.evaluate(() => { const i = activeCards().findIndex(c => c.es === '¿Qué onda?');
    state.progress[activeCards()[i]._id] = {box: 1, due: Date.now() + 6e5};
    startSession(true); state.order = [i, i]; state.idx = 0; render(); });
  await p5.click('#knowBtn'); // not due yet -> note under the next card
  ok((await p5.textContent('#stage')).includes('wasn’t due yet'), 'practice: early answer explains schedule unchanged');
  await p5.click('#knowBtn'); // last card of the round -> note on the end screen
  ok((await p5.textContent('#stage')).includes('wasn’t due yet') && !!(await p5.$('.done')), 'practice note also shown on end screen');
  await p5.evaluate(() => { const now = Date.now();
    levelCards('everyday', 0).forEach((c, i) => state.progress[c._id] = {box: i ? 2 : 1, due: i ? now + 1e9 : now - 1});
    state.practice = false; resetDeckState(); state.order.push(0, 1); render(); });
  ok(await p5.evaluate(() => state.order.length) === 3, 'setup: one due card plus two extra queued');
  await p5.click('#knowBtn');
  ok((await p5.textContent('#stage')).includes('Level up') && !!(await p5.$('#stayBtn')), 'level-up appears immediately, with "Finish this round first"');
  await p5.click('#modeQuiz');
  ok((await p5.textContent('#stage')).includes('Level up'), 'level-up survives switching to Quiz');
  await p5.click('#nextLevelBtn');
  ok(await p5.evaluate(() => currentLevel('everyday')) === 1 && !(await p5.textContent('#stage')).includes('Level up'), 'Start next level dismisses it');

  // 16. Scriptable wrapper, run against simulated Scriptable APIs, with the page in Chromium
  const wrapper = fs.readFileSync(path.join(DIST, 'Aprende Conmigo.js'), 'utf8');
  const makeFm = (files, dir) => ({ files, documentsDirectory: () => dir, joinPath: (a, b) => a + '/' + b,
    fileExists: p => p in files, isFileDownloaded: () => true, downloadFileFromiCloud: async () => {},
    readString: p => files[p], writeString: (p, s) => { files[p] = s; } });
  const localFiles = {}, cloudFiles = {};
  localFiles['/local/aprende-conmigo-progress.json'] = JSON.stringify({ progress: JSON.stringify({'food/Repetir': {box: 3, due: 9e12}}) });
  const runWrapper = async (interact) => {
    const ctxS = await newCtx(); const pS = await ctxS.newPage();
    pS.on('pageerror', e => { console.log('PAGEERROR-S', e.message); fails++; });
    class WebView {
      async loadHTML(html, base) {
        await pS.exposeFunction('__scriptableRequest', url => this.shouldAllowRequest({ url }));
        await pS.addInitScript(() => { Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
          set(v){ window.__scriptableRequest(v); }, get(){ return ''; } }); });
        await pS.route(base, r => r.fulfill({ contentType: 'text/html', body: html }));
        await pS.goto(base);
      }
      async present() { await interact(pS); }
      async evaluateJavaScript(code) { return pS.evaluate(code); }
    }
    const env = { FileManager: { local: () => makeFm(localFiles, '/local'), iCloud: () => makeFm(cloudFiles, '/cloud') },
      Data: { fromBase64String: b => ({ toRawString: () => Buffer.from(b, 'base64').toString('utf8') }) },
      WebView, config: { runsInWidget: false }, Script: { complete(){} }, console };
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    await new AsyncFunction(...Object.keys(env), wrapper)(...Object.values(env));
    return { close: () => ctxS.close() };
  };
  let seenInPage;
  const r1 = await runWrapper(async pS => {
    seenInPage = await pS.evaluate(() => Storage.backend + ':' + (state.progress['food/Repetir'] || {}).box);
    await pS.click('#knowBtn'); await pS.waitForTimeout(600);
  });
  ok(seenInPage === 'scriptable:3', 'Scriptable: local save carried into iCloud run (' + seenInPage + ')');
  const cloud = JSON.parse(cloudFiles['/cloud/aprende-conmigo-progress.json'] || '{}');
  ok(cloud.progress && Object.keys(JSON.parse(cloud.progress)).length === 2, 'Scriptable: new answer saved to iCloud file');
  await r1.close();
  const r2 = await runWrapper(async pS => { seenInPage = await pS.evaluate(() => Object.keys(state.progress).length); });
  ok(seenInPage === 2, 'Scriptable: progress reloaded on next launch');
  await r2.close();

  // 17. greeting follows the time of day
  for (const [t, es, en] of [['08:30', '¡Buenos días, Sam!', 'Good morning'], ['15:00', '¡Buenas tardes, Sam!', 'Good afternoon'],
                            ['20:00', '¡Buenas noches, Sam!', 'Good evening'], ['02:00', '¡Buenas noches, Sam!', 'It’s late']]) {
    const pg = await (await newCtx()).newPage();
    await pg.clock.install({ time: new Date('2026-09-29T' + t + ':00') });
    await pg.goto(URL);
    const g = await pg.textContent('#greeting');
    ok(g.includes(es) && g.includes(en) && g.includes('110 phrases ready'), 'greeting at ' + t + ': ' + es + ' / ' + en);
    await pg.close();
  }

  // 18-22. daily challenges, streak, achievements
  const pc = await (await newCtx()).newPage();
  pc.on('pageerror', e => { console.log('PAGEERROR-C', e.message); fails++; });
  await pc.clock.install({ time: new Date('2026-09-29T09:00:00') });
  await pc.goto(URL);
  const picks = await pc.evaluate(() => {
    const names = deckNames(), out = {};
    for (let d = 0; d < 20; d++) {
      const t = new Date(2026, 8, 1 + d, 12).getTime();
      const a = Challenges.dailyStatus(Challenges.blankStats(), t, names).map(c => c.id);
      const b = Challenges.dailyStatus(Challenges.blankStats(), t, names).map(c => c.id);
      out[d] = { a, same: a.join() === b.join() };
    }
    return out;
  });
  const days = Object.values(picks);
  ok(days.every(d => d.same && d.a.length === 3 && new Set(d.a).size === 3), 'three distinct daily challenges, same all day');
  ok(days.every(d => d.a.filter(id => id.startsWith('correct')).length === 1), 'each day has exactly one "get N right" challenge');
  ok(new Set(days.map(d => d.a.join())).size > 5, 'challenges change from day to day');

  const listenBefore = await pc.evaluate(() => state.stats.listenedTotal);
  await pc.click('#soundBtn'); await pc.click('.card-word');
  ok(await pc.evaluate(() => state.stats.listenedTotal) === listenBefore + 1, 'tapping the speaker counts as listening');
  ok(await pc.evaluate(() => state.stats.days[Challenges.dayKey(Date.now())].flipped) === 1, 'flipping to the back counts');

  const day = await pc.evaluate(() => Challenges.dailyStatus(state.stats, Date.now(), deckNames()));
  const correctGoal = day.find(c => c.id.startsWith('correct')).target;
  for (let i = 0; i < correctGoal; i++) {
    await pc.evaluate(() => { if (state.idx >= state.order.length) startSession(true); render(); });
    await pc.click('#knowBtn');
  }
  const after = await pc.evaluate(() => Challenges.dailyStatus(state.stats, Date.now(), deckNames()));
  ok(after.find(c => c.id.startsWith('correct')).done, 'answering ' + correctGoal + ' right completes the daily goal');
  ok((await pc.textContent('#toast')).includes('Challenge done') || (await pc.textContent('#challenges')).includes(correctGoal + '/' + correctGoal), 'challenge completion shown');
  ok(await pc.evaluate(() => !!state.stats.earned.first), 'achievement: Primeros pasos earned');
  ok((await pc.textContent('#streak')).includes('1-day streak'), 'streak shows 1 day: ' + await pc.textContent('#streak'));

  // streak rules, directly
  const streaks = await pc.evaluate(() => {
    const s = Challenges.blankStats(), at = (d, h) => new Date(2026, 9, d, h).getTime();
    const ev = t => Challenges.recordAnswer(s, { deck: 'food', correct: true, mode: 'flash', now: t });
    ev(at(1, 9)); ev(at(1, 20)); const a = s.streak;
    ev(at(2, 8)); const b = s.streak;
    const c = Challenges.currentStreak(s, at(3, 12));   // missed nothing yet
    const d = Challenges.currentStreak(s, at(4, 12));   // missed day 3 -> broken
    ev(at(4, 12)); const e = s.streak;
    ev(at(4, 23)); return { a, b, c, d, e, best: s.bestStreak, late: s.late, early: s.early };
  });
  ok(streaks.a === 1 && streaks.b === 2 && streaks.c === 2, 'streak counts consecutive days');
  ok(streaks.d === 0 && streaks.e === 1 && streaks.best === 2, 'missing a day resets the streak; best is kept');
  ok(streaks.late && !streaks.early, 'practising after 10pm earns the study-night flag');

  // quiz run, perfect round and clearing a level
  const quiz = await pc.evaluate(() => {
    state.progress = {}; state.stats = Challenges.blankStats(); state.mode = 'quiz'; startSession(false);
    state.order = state.order.slice(0, 5);
    for (let i = 0; i < 5; i++) { state.correctCount++; recordAnswer(activeCards()[state.order[state.idx]]._id, true); state.idx++; }
    const d = state.stats.days[Challenges.dayKey(Date.now())];
    return { run: d.bestRun, perfect: d.perfect };
  });
  ok(quiz.run === 5 && quiz.perfect === 1, 'quiz: 5 in a row and a perfect round recorded');
  const cleared = await pc.evaluate(() => {
    state.mode = 'flash'; startSession(false);
    while (state.idx < state.order.length) { recordAnswer(activeCards()[state.order[state.idx]]._id, true); state.idx++; }
    return state.stats.days[Challenges.dayKey(Date.now())].cleared;
  });
  ok(cleared >= 1, 'clearing everything due in a level is recorded');

  // export / import carries achievements and best streak
  const merged2 = await pc.evaluate(() => {
    const code = encodeProgressBlob({ progress: { 'food/Repetir': { box: 1, due: 1, seen: 1 } },
      challenges: { bestStreak: 12, earned: { streak7: 1000, bogus: 5 }, listenedTotal: 3 } });
    const before = state.stats.listenedTotal;
    applyImport(code);
    return { best: state.stats.bestStreak, s7: state.stats.earned.streak7, bogus: 'bogus' in state.stats.earned,
             listened: state.stats.listenedTotal >= before, s3: !!state.stats.earned.streak3 };
  });
  ok(merged2.best === 12 && merged2.s7 === 1000 && !merged2.bogus && merged2.s3, 'import merges achievements and best streak');
  ok(await pc.evaluate(() => { state.syncPanel = 'export'; renderSync(); return !!decodeProgressBlob(document.getElementById('exportBox').value).challenges; }),
     'export includes challenges');
  await pc.close();

  // 23. profiles: welcome, legacy progress, second profile with PIN, switching, deleting
  const pctx = await newCtx(false); const pp = await pctx.newPage();
  pp.on('pageerror', e => { console.log('PAGEERROR-P', e.message); fails++; });
  await pp.clock.install({ time: new Date('2026-09-29T08:30:00') });
  await pp.goto(URL);
  await pp.evaluate(() => localStorage.setItem('progress', JSON.stringify({ 'food/Repetir': { box: 2, due: 9e12 } })));
  await pp.reload(); await appReady(pp);
  ok(await pp.isVisible('#login') && !(await pp.isVisible('#main')), 'first launch shows the welcome screen, app hidden');
  ok((await pp.textContent('#login')).includes('progress already on this device will be kept'), 'welcome mentions keeping existing progress');
  await pp.click('#saveProfileBtn');
  ok((await pp.textContent('#formError')).includes('enter a name'), 'name is required');
  await pp.fill('#nameInput', 'Sam'); await pp.fill('#pinSet', '12');
  await pp.click('#saveProfileBtn');
  ok((await pp.textContent('#formError')).includes('4 digits'), 'PIN must be 4 digits');
  await pp.fill('#pinSet', ''); await pp.click('#saveProfileBtn');
  ok(await pp.isVisible('#main') && (await pp.textContent('#greeting')).includes('¡Buenos días, Sam!'), 'greeting uses the name');
  ok(await pp.evaluate(() => state.progress['food/Repetir'].box) === 2, 'first profile keeps the existing progress');
  ok((await pp.textContent('#profileChip')).includes('Sam'), 'profile button shows the name');
  await pp.reload(); await appReady(pp);
  ok(await pp.isVisible('#main'), 'no PIN: straight back in on the next launch');

  // add a second profile with a PIN
  await pp.click('#chipBtn'); await pp.click('#menuSwitch');
  ok((await pp.textContent('#login')).includes('¿Quién va a practicar?'), 'switch shows the profile picker');
  await pp.click('#addProfileBtn');
  await pp.fill('#nameInput', 'sam'); await pp.click('#saveProfileBtn');
  ok((await pp.textContent('#formError')).includes('already a profile'), 'duplicate names are rejected');
  await pp.fill('#nameInput', 'Alex <b>'); await pp.fill('#pinSet', '4321'); await pp.click('#saveProfileBtn');
  ok((await pp.textContent('#greeting')).includes('¡Buenos días, Alex <b>!') && !(await pp.$('#greeting b')), 'second profile greeted by name (and names are escaped)');
  ok(await pp.evaluate(() => Object.keys(state.progress).length) === 0, 'second profile starts with its own empty progress');
  await pp.click('#knowBtn');
  ok(await pp.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('progress'))).length) === 1, "Alex's answers don't touch Sam's progress");
  ok(await pp.evaluate(() => Object.keys(localStorage).some(k => /^p:[a-z0-9]+:progress$/.test(k))), "Alex's progress is stored under their own keys");

  // PIN on the next launch
  await pp.reload(); await appReady(pp);
  ok(await pp.isVisible('#pinInput') && !(await pp.isVisible('#main')), 'profile with a PIN asks for it on launch');
  await pp.fill('#pinInput', '1111');
  ok((await pp.textContent('#pinError')).includes('isn’t right') && !(await pp.isVisible('#main')), 'wrong PIN is refused');
  await pp.fill('#pinInput', '4321');
  ok(await pp.isVisible('#main') && await pp.evaluate(() => Object.keys(state.progress).length) === 1, 'right PIN opens Alex with their progress');
  ok(!(await pp.evaluate(() => localStorage.getItem('profiles'))).includes('4321'), 'PIN is not stored as typed');

  // switch back to Sam: no PIN, Sam's own state
  await pp.click('#chipBtn'); await pp.click('#menuSwitch');
  await pp.click('.profile-pick:has-text("Sam")');
  ok((await pp.textContent('#greeting')).includes('Sam') && await pp.evaluate(() => !!state.progress['food/Repetir']), 'switching loads the other profile');

  // edit: remove nothing, rename
  await pp.click('#chipBtn'); await pp.click('#menuEdit');
  await pp.fill('#nameInput', 'Samuel'); await pp.click('#saveProfileBtn');
  ok((await pp.textContent('#greeting')).includes('Samuel'), 'renaming updates the greeting');

  // delete Alex via the forgotten-PIN route (two taps)
  await pp.click('#chipBtn'); await pp.click('#menuSwitch');
  await pp.click('.profile-pick:has-text("Alex")');
  await pp.click('#forgotBtn'); await pp.click('#forgotDeleteBtn');
  ok((await pp.textContent('#forgotDeleteBtn')).includes('Tap again') && await pp.isVisible('#pinInput'), 'first tap on delete only asks again');
  await pp.click('#forgotDeleteBtn');
  ok((await pp.$$('.profile-pick[data-id]')).length === 1, 'second tap deletes the profile');
  ok(await pp.evaluate(() => !Object.keys(localStorage).some(k => k.startsWith('p:') && localStorage.getItem(k))), "deleted profile's progress is cleared");
  await pctx.close();

  // 24. quiz question types
  const qctx = await newCtx();
  await qctx.addInitScript(() => {
    // Stand-in speech recogniser: "hears" whatever the test puts in window.__say.
    window.SpeechRecognition = class { start(){ setTimeout(() => { this.onresult({ results: [[{ transcript: window.__say }]] }); this.onend && this.onend(); }, 20); } };
  });
  const pq = await qctx.newPage();
  pq.on('pageerror', e => { console.log('PAGEERROR-Q', e.message); fails++; });
  await pq.clock.install({ time: new Date('2026-09-29T15:00:00') });
  await pq.goto(URL);

  // answer checking and gendered variants
  const checks = await pq.evaluate(() => ({
    v1: spanishVariants('Estoy orgulloso / orgullosa de ti'), v2: spanishVariants('Mi esposo / Mi esposa'),
    v3: spanishVariants('Bienvenido / Bienvenida a casa'), v4: spanishVariants('Ando bien ocupado / ocupada'),
    exact: checkAnswer('¿Qué tal?', { es: '¿Qué tal?' }), accents: checkAnswer('que tal', { es: '¿Qué tal?' }),
    typo: checkAnswer('te extrano mucho', { es: 'Los extraño mucho' }), close: checkAnswer('pienso en ti todo el dia', { es: 'Pienso en ti todo el día' }),
    wrong: checkAnswer('hola', { es: '¿Qué tal?' }), fem: checkAnswer('estoy orgullosa de ti', { es: 'Estoy orgulloso / orgullosa de ti' }),
    empty: checkAnswer('   ', { es: 'Te extraño' }),
  }));
  ok(checks.v1.join('|') === 'Estoy orgulloso de ti|Estoy orgullosa de ti' && checks.v2.join('|') === 'Mi esposo|Mi esposa' &&
     checks.v3.join('|') === 'Bienvenido a casa|Bienvenida a casa' && checks.v4.join('|') === 'Ando bien ocupado|Ando bien ocupada', 'both gender forms spelled out');
  ok(checks.exact.ok && !checks.exact.note && checks.accents.ok && checks.accents.note.includes('¿Qué tal?'), 'typing forgives accents/punctuation but shows the proper spelling');
  ok(!checks.typo.ok && checks.close.ok && !checks.wrong.ok && checks.fem.ok && !checks.empty.ok, 'typing: wrong words rejected, either gender form accepted');

  // helper: show one card of the love deck's first level as a given type
  const ask = (type, es, box) => pq.evaluate(([type, es, box]) => {
    state.deck = 'love'; state.levelByDeck.love = 0; state.quizType = type; state.mode = 'quiz'; state.practice = false;
    const id = 'love/' + es;
    state.progress[id] = { box: box || 0, due: Date.now() - 1 };
    resetDeckState();
    const cards = activeCards();
    state.order = [cards.findIndex(c => c.es === es), (cards.findIndex(c => c.es === es) + 1) % cards.length];
    render();
    return id;
  }, [type, es, box]);
  const boxOf = id => pq.evaluate(id => state.progress[id].box, id);
  const clickText = async text => pq.click(`#optsWrap .opt-btn:text-is("${text}")`);

  let id = await ask('reverse', 'Te extraño');
  ok((await pq.textContent('.quiz-en')).includes('I miss you'), 'reverse: shows the English');
  await clickText('Te extraño');
  ok(await boxOf(id) === 1 && (await pq.textContent('.quiz-reveal')).includes('Correct'), 'reverse: right Spanish option counts');

  id = await ask('listen', 'Te extraño');
  ok(!(await pq.$('.quiz-word')) && !!(await pq.$('#listenBtn')), 'listening: phrase is hidden, play button shown');
  await clickText('I miss you');
  ok(await boxOf(id) === 1 && (await pq.textContent('.reveal-es')).includes('Te extraño'), 'listening: right meaning counts and the phrase is revealed');

  id = await ask('type', 'Te extraño');
  await pq.fill('#typeInput', 'te extrano'); await pq.press('#typeInput', 'Enter');
  ok(await boxOf(id) === 1 && (await pq.textContent('#stage')).includes('With its accents'), 'type: typed answer counts, accent reminder shown');
  id = await ask('type', 'Te extraño', 3);
  await pq.click('#dontKnowBtn');
  ok(await boxOf(id) === 1 && (await pq.textContent('.quiz-reveal')).includes('The answer'), "type: \"I don't know\" counts as wrong and shows the answer");

  id = await ask('gap', 'Me haces muy feliz');
  const gapAnswer = await pq.evaluate(() => { const blank = document.querySelector('.gap-line').textContent; return ['Me','haces','muy','feliz'].find(w => !blank.includes(w)); });
  await clickText(gapAnswer);
  ok(await boxOf(id) === 1, 'fill the gap: picking the missing word (' + gapAnswer + ') counts');

  id = await ask('build', 'Me haces muy feliz');
  for (const w of ['Me', 'haces', 'muy', 'feliz']) await pq.click(`#buildTiles button.tile:text-is("${w}")`);
  await pq.click('#checkBtn');
  ok(await boxOf(id) === 1 && await pq.$eval('#buildAnswer', el => el.classList.contains('correct')), 'build: words in the right order count');
  id = await ask('build', 'Me haces muy feliz');
  for (const w of ['feliz', 'muy', 'haces', 'Me']) await pq.click(`#buildTiles button.tile:text-is("${w}")`);
  await pq.click('#checkBtn');
  ok(await boxOf(id) === 0, 'build: wrong order counts as wrong');

  id = await ask('scenario', 'Te extraño');
  ok((await pq.textContent('.quiz-scenario')).includes('away for a week'), 'scenario: situation shown');
  await clickText('Te extraño');
  ok(await boxOf(id) === 1, 'scenario: right phrase counts');

  id = await ask('speak', 'Te extraño');
  await pq.evaluate(() => { window.__say = 'te extraño'; });
  await pq.click('#micBtn'); await pq.waitForTimeout(100);
  ok(await boxOf(id) === 1 && (await pq.textContent('#heardNote')).includes('te extraño'), 'speak: saying it right counts');
  id = await ask('speak', 'Te extraño');
  await pq.evaluate(() => { window.__say = 'buenas noches'; });
  await pq.click('#micBtn'); await pq.waitForTimeout(100);
  ok(await boxOf(id) === 0 && !!(await pq.$('#giveUpBtn')), 'speak: wrong attempt allows a retry, nothing recorded yet');
  await pq.click('#skipSpeakBtn');
  ok(!!(await pq.$('.quiz-word')) && await boxOf(id) === 0, '"Can\'t talk right now" asks the same card another way');

  // gap and build aren't offered for one-word or gendered cards
  const suits = await pq.evaluate(() => {
    const everyday = deckCards('everyday'), love = deckCards('love');
    const c = es => everyday.concat(love).find(x => x.es === es);
    return { gapOne: canUseType('gap', c('Ahorita'), everyday), buildGender: canUseType('build', c('Estoy orgulloso / orgullosa de ti'), love),
             scenNone: canUseType('scenario', c('Mi cielo'), love), scenYes: canUseType('scenario', c('Te extraño'), love) };
  });
  ok(!suits.gapOne && !suits.buildGender && !suits.scenNone && suits.scenYes, 'types are only used on cards that suit them');

  // Mixed gets harder with the card's box
  const mixed = await pq.evaluate(() => {
    state.quizType = 'mixed'; state.speakInMix = false;
    const pool = levelCards('love', 0), card = pool.find(c => c.es === 'Te extraño');
    const kinds = box => { state.progress[card._id] = { box, due: 0 }; const s = new Set(); for (let i = 0; i < 200; i++) s.add(pickQuizType(card, pool)); return [...s].sort(); };
    return { b0: kinds(0), b1: kinds(1), b2: kinds(2), b5: kinds(5) };
  });
  ok(mixed.b0.join() === 'recognize', 'mixed: new cards are Spanish → English');
  ok(mixed.b1.join() === 'listen,recognize,reverse', 'mixed: box 1 adds reverse and listening');
  ok(!mixed.b2.includes('recognize') && mixed.b2.includes('scenario') && !mixed.b2.includes('type'), 'mixed: known cards get harder types: ' + mixed.b2);
  ok(mixed.b5.includes('type') && !mixed.b5.includes('speak') && !mixed.b5.includes('recognize'), 'mixed: strong cards are typed etc., no speaking unless turned on: ' + mixed.b5);

  // question type choice is saved per profile
  await pq.click('#modeQuiz');
  await pq.selectOption('#quizTypeSelect', 'type');
  ok(await pq.evaluate(() => JSON.parse(localStorage.getItem('prefs')).quizType) === 'type', 'question type choice is saved');

  // Match the pairs
  const progressBeforeMatch = await pq.evaluate(() => JSON.stringify(state.progress));
  await pq.selectOption('#quizTypeSelect', 'match');
  const tiles = await pq.evaluate(() => [...document.querySelectorAll('.match-tile.es')].length);
  ok(tiles === 5, 'match: five pairs dealt');
  // one mistake, then solve it
  await pq.evaluate(() => {
    const es = [...document.querySelectorAll('.match-tile[data-side="es"]')], en = [...document.querySelectorAll('.match-tile[data-side="en"]')];
    const enText = t => stripNote(activeCards().find(c => c.es === t).en);
    es[0].click(); en.find(b => b.textContent !== enText(es[0].textContent)).click();
    es.forEach(b => { const want = enText(b.textContent); b.click(); en.find(x => x.textContent === want).click(); });
  });
  ok((await pq.textContent('.match-done')).includes('1 mistake') && await pq.evaluate(() => state.stats.matchGames) === 1, 'match: finishing records the game and mistakes');
  ok(await pq.evaluate(() => JSON.stringify(state.progress)) === progressBeforeMatch, "match: doesn't change the review schedule");

  // challenges/achievements see the new types
  const typeStats = await pq.evaluate(() => ({ d: state.stats.days[Challenges.dayKey(Date.now())], t: state.stats }));
  ok(typeStats.d.byType.type === 1 && typeStats.d.byType.build === 1 && typeStats.d.matched === 1 && typeStats.t.typedTotal === 1 && typeStats.t.spokenTotal === 1,
     'new types are counted for challenges');
  ok(['recognize', 'reverse', 'listen', 'type', 'gap', 'build', 'scenario'].every(k => typeStats.t.typesDone[k] || k === 'recognize'), 'types done are tracked');
  await qctx.close();

  // 25. difficulty levels
  const dctx = await newCtx(); const pd = await dctx.newPage();
  pd.on('pageerror', e => { console.log('PAGEERROR-D', e.message); fails++; });
  await pd.goto(URL);
  ok(await pd.evaluate(() => state.difficulty) === 'normal' && (await pd.textContent('#difficulty')).includes('Normal'), 'difficulty defaults to Normal and is shown');
  ok(await pd.isVisible('.face-front .card-sub'), 'Normal: pronunciation shown on the flashcard');
  await pd.click('.diff-btn[data-diff="hard"]');
  ok(!(await pd.$('.face-front .card-sub')) && (await pd.textContent('.face-back')).length > 0, 'Difícil: pronunciation hidden on the front (still on the back)');
  ok(await pd.evaluate(() => JSON.parse(localStorage.getItem('prefs')).difficulty) === 'hard', 'difficulty is saved');
  await pd.reload(); await appReady(pd);
  await appReady(pd);
  const kept = await pd.waitForFunction(() => state.difficulty === 'hard', null, { timeout: 5000 }).then(() => true, () => false);
  ok(kept && await pd.isVisible('.diff-btn[data-diff="hard"].active'), 'difficulty survives a restart');

  const dq = (diff, type, es) => pd.evaluate(([diff, type, es]) => {
    state.difficulty = diff; state.deck = 'love'; state.levelByDeck.love = 0; state.quizType = type; state.mode = 'quiz'; state.practice = true;
    resetDeckState(); const cards = activeCards(); state.order = [cards.findIndex(c => c.es === es), 1]; render();
    return { opts: document.querySelectorAll('#optsWrap .opt-btn').length, tiles: document.querySelectorAll('#buildTiles .tile').length,
             pron: !!document.querySelector('#stage .card-sub'), match: document.querySelectorAll('.match-tile.es').length };
  }, [diff, type, es]);
  const easyQ = await dq('easy', 'recognize', 'Te extraño'), normalQ = await dq('normal', 'recognize', 'Te extraño'), hardQ = await dq('hard', 'recognize', 'Te extraño');
  ok(easyQ.opts === 3 && normalQ.opts === 4 && hardQ.opts === 5, 'choices: 3 / 4 / 5 by difficulty');
  ok(easyQ.pron && normalQ.pron && !hardQ.pron, 'quiz pronunciation hidden only on Difícil');
  const eb = await dq('easy', 'build', 'Me haces muy feliz'), hb = await dq('hard', 'build', 'Me haces muy feliz');
  ok(eb.tiles === 4 && hb.tiles === 6, 'Difícil adds 2 decoy words to Build the phrase');
  for (const w of ['Me', 'haces', 'muy', 'feliz']) await pd.click(`#buildTiles button.tile:text-is("${w}")`);
  ok(!(await pd.$eval('#checkBtn', b => b.disabled)), 'build with decoys: can check once the real words are placed');
  await pd.click('#checkBtn');
  ok(await pd.$eval('#buildAnswer', el => el.classList.contains('correct')), 'build with decoys: correct order still counts');
  const em = await dq('easy', 'match', 'Te extraño'), hm = await dq('hard', 'match', 'Te extraño');
  ok(em.match === 4 && hm.match === 6, 'match pairs: 4 on Fácil, 6 on Difícil');

  const typing = await pd.evaluate(() => {
    const card = { es: 'Pienso en ti todo el día' };
    return { easy2: checkAnswer('pienso en ti todo el dai', card, DIFFICULTY.easy).ok, normal2: checkAnswer('piensp en ti todo el dia', card, DIFFICULTY.normal).ok && !checkAnswer('piensa en ti todo el dai', card, DIFFICULTY.normal).ok,
             hardAccent: checkAnswer('pienso en ti todo el dia', card, DIFFICULTY.hard), hardRight: checkAnswer('Pienso en ti todo el día', card, DIFFICULTY.hard).ok,
             hardPunct: checkAnswer('¿pienso en ti todo el día?', card, DIFFICULTY.hard).ok, normalAccent: checkAnswer('pienso en ti todo el dia', card, DIFFICULTY.normal).ok };
  });
  ok(typing.easy2 && typing.normal2 && typing.normalAccent, 'Fácil/Normal forgive typos and missing accents');
  ok(!typing.hardAccent.ok && typing.hardAccent.note.includes('accents count') && typing.hardRight && typing.hardPunct, 'Difícil: accents must be right (punctuation still ignored)');

  const tiersD = await pd.evaluate(() => {
    state.quizType = 'mixed'; state.speakInMix = false;
    const pool = levelCards('love', 0), card = pool.find(c => c.es === 'Me haces muy feliz');
    const kinds = (diff, box) => { state.difficulty = diff; state.progress[card._id] = { box, due: 0 }; const s = new Set(); for (let i = 0; i < 200; i++) s.add(pickQuizType(card, pool)); return [...s].sort().join(); };
    return { hard0: kinds('hard', 0), easy4: kinds('easy', 4), hard4: kinds('hard', 4) };
  });
  ok(tiersD.hard0 === 'recognize,reverse', 'Difícil: new cards can already be asked English → Spanish');
  ok(!tiersD.easy4.includes('type') && tiersD.hard4 === 'build,scenario,type', 'Fácil never forces typing; Difícil strong cards are typed/built/used: ' + tiersD.easy4 + ' | ' + tiersD.hard4);
  ok(await pd.evaluate(() => { const r = []; ['easy', 'normal', 'hard'].forEach(d => { state.difficulty = d; r.push(level().speechRate); }); return r[0] < r[1] && r[1] < r[2]; }), 'audio: slower on Fácil, natural on Difícil');
  const hardCount = await pd.evaluate(() => { state.difficulty = 'hard'; const before = state.stats.hardCorrect; recordAnswer('love/Te extraño', true, 'recognize'); return state.stats.hardCorrect - before; });
  ok(hardCount === 1, 'right answers on Difícil count toward "Modo difícil"');
  await dctx.close();

  // 26. log out
  const lctx = await newCtx(); const pl = await lctx.newPage();
  pl.on('pageerror', e => { console.log('PAGEERROR-L', e.message); fails++; });
  await pl.goto(URL);
  await pl.click('#knowBtn');
  await pl.click('#chipBtn');
  ok(await pl.isVisible('#menuLogout'), 'profile menu has Log out');
  await pl.click('#menuLogout');
  ok(await pl.isVisible('#login') && !(await pl.isVisible('#main')) && (await pl.textContent('#login')).includes('¿Quién va a practicar?'), 'log out shows who-is-practising screen');
  ok(await pl.evaluate(() => JSON.parse(localStorage.getItem('profiles')).active) === null, 'log out forgets the signed-in profile');
  // "Next launch": re-run the start-up against what's saved. (A real reload here is
  // unreliable only in this test browser when many windows run at once.)
  const pickerOnLaunch = await pl.evaluate(async () => {
    await Profiles.start(async () => {});
    return !document.getElementById('login').hidden && document.getElementById('main').hidden && !!document.querySelector('.profile-pick');
  });
  ok(pickerOnLaunch, 'after logging out, the next launch does not sign straight in');
  await pl.reload(); await appReady(pl);
  if (await pl.isVisible('.profile-pick')) await pl.click('.profile-pick:has-text("Sam")');
  await pl.waitForFunction(() => Profiles.current() && typeof state !== 'undefined' && Object.keys(state.progress).length === 1, null, { timeout: 5000 }).catch(() => {});
  ok(await pl.isVisible('#main') && await pl.evaluate(() => Object.keys(state.progress).length) === 1, 'signing back in keeps the progress');
  await lctx.close();

  // 27. works offline (served as the website, like GitHub Pages)
  const http = require('http');
  const SITE = path.join(DIST, 'site');
  const server = http.createServer((q, r) => {
    let f = decodeURIComponent(q.url.split('?')[0]);
    if (f.endsWith('/')) f += 'index.html';
    fs.readFile(path.join(SITE, f), (err, data) => {
      if (err) { r.writeHead(404); return r.end(); }
      const type = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }[path.extname(f)] || 'application/octet-stream';
      r.writeHead(200, { 'Content-Type': type }); r.end(data);
    });
  });
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const siteUrl = 'http://127.0.0.1:' + server.address().port + '/';
  const octx = await newCtx(); const po = await octx.newPage();
  po.on('pageerror', e => { console.log('PAGEERROR-O', e.message); fails++; });
  await po.goto(siteUrl); await appReady(po);
  await po.evaluate(() => navigator.serviceWorker.ready);
  await po.reload(); await appReady(po); // now controlled by the service worker, which saves a copy
  await po.waitForFunction(async () => (await caches.keys()).some(k => k.startsWith('aprende-')));
  await octx.setOffline(true);
  await po.reload(); await appReady(po);
  ok(await po.isVisible('#main') && (await po.textContent('#greeting')).includes('Sam'), 'opens with no connection once visited');
  await octx.setOffline(false);
  await octx.close(); server.close();

  // 28. dark mode follows the phone setting
  const dkctx = await newCtx(); const pk = await dkctx.newPage();
  await pk.emulateMedia({ colorScheme: 'dark' }); await pk.goto(URL); await appReady(pk);
  const darkBg = await pk.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await pk.emulateMedia({ colorScheme: 'light' });
  const lightBg = await pk.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok(darkBg === 'rgb(26, 22, 20)' && lightBg === 'rgb(251, 243, 231)', 'dark background in dark mode, cream in light (' + darkBg + ' / ' + lightBg + ')');
  await dkctx.close();

  { // 29. your own voice + sharing (own block: keeps its names separate)
  const vctx = await newCtx();
  await vctx.addInitScript(() => {
    // Stand-in microphone and recorder, and spies on playback and sharing.
    window.__played = []; window.__spoken = []; window.__shared = [];
    navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [{ stop(){} }] });
    window.MediaRecorder = class {
      constructor(){ this.state = 'inactive'; this.mimeType = 'audio/webm'; }
      static isTypeSupported(t){ return t === 'audio/webm'; }
      start(){ this.state = 'recording'; }
      stop(){ this.state = 'inactive'; this.ondataavailable({ data: new Blob(['clip'], { type: 'audio/webm' }) }); this.onstop(); }
    };
    HTMLMediaElement.prototype.play = function(){ window.__played.push(this.src); return Promise.resolve(); };
    speechSynthesis.speak = u => window.__spoken.push(u.text);
    navigator.share = async d => { window.__shared.push(d); };
  });
  const pv = await vctx.newPage();
  pv.on('pageerror', e => { console.log('PAGEERROR-V', e.message); fails++; });
  await pv.goto(URL); await appReady(pv);
  await pv.click('#chipBtn'); await pv.click('#menuVoice');
  ok(await pv.isVisible('#panel') && !(await pv.isVisible('#main')) && (await pv.$$('.voice-row')).length === 30, 'recording screen lists the deck\'s 30 phrases');
  const firstEs = await pv.textContent('.voice-row .voice-es');
  // force: the Stop button pulses, and the test tool would otherwise wait for it to stop moving
  const recBtn = pv.locator('.voice-row').nth(0).locator('.voice-btn.rec');
  await recBtn.click();
  ok((await recBtn.textContent()) === 'Stop', 'record button turns into Stop while recording');
  await recBtn.click({ force: true });
  ok(await pv.evaluate(() => recording === null), 'tapping Stop ends the recording (no second one starts)');
  await pv.waitForSelector('.voice-row.has');
  ok((await pv.textContent('.panel-count')).startsWith('1 of 30') && await pv.evaluate(es => Voice.has(es), firstEs), 'recording is saved');
  await pv.click('#panelBack');
  ok(await pv.isVisible('#main'), 'back returns to the app');
  const before = await pv.evaluate(() => ({ played: __played.length, spoken: __spoken.length }));
  await pv.evaluate(es => speak(es), firstEs); await pv.waitForTimeout(50);
  const after = await pv.evaluate(() => ({ played: __played.length, spoken: __spoken.length, src: __played[__played.length - 1] }));
  ok(after.played === before.played + 1 && after.spoken === before.spoken && after.src.startsWith('blob:'), 'speaker plays your recording instead of the phone voice');
  await pv.evaluate(() => speak('Nada grabado aquí'));
  ok(await pv.evaluate(() => __spoken.includes('Nada grabado aquí')), 'phrases without a recording still use the phone voice');
  await pv.reload(); await appReady(pv);
  await pv.waitForFunction(es => Voice.has(es), firstEs);
  ok(true, 'recordings survive a restart');
  await pv.click('#chipBtn'); await pv.click('#menuVoice');
  await pv.click('.voice-row.has .voice-btn.del'); await pv.click('.voice-row.has .voice-btn.del');
  await pv.waitForFunction(() => !document.querySelector('.voice-row.has'));
  ok(!(await pv.evaluate(es => Voice.has(es), firstEs)), 'recording can be deleted (two taps)');
  await pv.click('#panelBack');
  await pv.click('.card-word'); await pv.click('#shareBtn');
  const shared = await pv.evaluate(() => __shared[0]);
  const shownEs = await pv.textContent('.face-front .card-word');
  ok(shared && shared.text.includes(shownEs) && shared.text.includes('Aprende Conmigo'), 'Share sends the phrase to the share sheet');
  ok(await pv.evaluate(() => document.getElementById('flipCard').classList.contains('flipped')), "tapping Share doesn't flip the card back");
  await vctx.close();
  }

  { // 30. My phrases
    const mctx = await newCtx(); const pm = await mctx.newPage();
    pm.on('pageerror', e => { console.log('PAGEERROR-M', e.message); fails++; });
    await pm.goto(URL); await appReady(pm);
    ok(!(await pm.evaluate(() => 'mine' in DECKS)), 'no My phrases deck until you add one');
    await pm.click('#chipBtn'); await pm.click('#menuMine');
    await pm.click('#mineSave');
    ok((await pm.textContent('#mineError')).includes('fill in'), 'Spanish and meaning are required');
    const add = async (es, en, pron, ctx) => { await pm.fill('#mineEs', es); await pm.fill('#mineEn', en); await pm.fill('#minePron', pron || ''); await pm.fill('#mineCtx', ctx || ''); await pm.click('#mineSave'); };
    await add('¿Me pasas el control?', 'Can you pass me the remote?', 'meh PAH-sahs el kohn-TROHL', 'You’re on the sofa and the remote is out of reach.');
    await add('Ya me voy a dormir', 'I’m off to bed');
    await add('ya me voy a dormir', 'dupe');
    ok((await pm.textContent('#mineError')).includes('already'), 'duplicates are rejected');
    ok((await pm.$$('.voice-list .voice-row')).length === 2, 'phrases are listed');
    await pm.click('#panelBack');
    ok((await pm.textContent('#decks')).includes('My phrases'), 'My phrases deck appears');
    await pm.click('.deck-btn:has-text("My phrases")');
    ok(await pm.evaluate(() => activeCards().length) === 2 && await pm.isVisible('#knowBtn'), 'its cards are studied like any other');
    const noPron = await pm.evaluate(() => { const i = activeCards().findIndex(c => c.es === 'Ya me voy a dormir'); state.order = [i]; state.idx = 0; render(); return document.querySelectorAll('.face-front .card-sub').length; });
    ok(noPron === 0, 'no empty pronunciation line when none was given');
    await pm.click('#knowBtn');
    const id = 'mine/Ya me voy a dormir';
    ok(await pm.evaluate(id => state.progress[id] && state.progress[id].box === 1, id), 'answers are recorded for My phrases');
    // quiz: only 2 phrases, so wrong options are borrowed from other decks
    const opts = await pm.evaluate(() => { state.mode = 'quiz'; state.quizType = 'recognize'; state.practice = true; resetDeckState(); render(); return document.querySelectorAll('#optsWrap .opt-btn').length; });
    ok(opts === 4, 'small deck still gets 4 choices (borrowed from other decks)');
    const scen = await pm.evaluate(() => { state.quizType = 'scenario'; const cards = activeCards(); state.order = [cards.findIndex(c => c.ctx)]; state.idx = 0; state.q = null; render(); return document.querySelector('.quiz-scenario') && document.querySelector('.quiz-scenario').textContent; });
    ok(scen && scen.includes('remote'), 'your situation is used in "What would you say?"');
    // edit keeps progress; delete removes it
    await pm.evaluate(() => { state.mode = 'flash'; });
    await pm.click('#chipBtn'); await pm.click('#menuMine');
    await pm.click('.voice-row:has-text("Ya me voy a dormir") [data-act="edit"]');
    await pm.fill('#mineEs', 'Ya me voy a dormir, mi amor'); await pm.click('#mineSave');
    ok(await pm.evaluate(() => !!state.progress['mine/Ya me voy a dormir, mi amor'] && !state.progress['mine/Ya me voy a dormir']), 'editing the Spanish keeps its progress');
    const exported = await pm.evaluate(() => { state.syncPanel = 'export'; renderSync(); return decodeProgressBlob(document.getElementById('exportBox').value).custom.length; });
    ok(exported === 2, 'export includes My phrases');
    await pm.click('.voice-row:has-text("dormir") [data-act="del"]'); await pm.click('.voice-row:has-text("dormir") [data-act="del"]');
    ok(await pm.evaluate(() => myPhrases.length === 1 && !state.progress['mine/Ya me voy a dormir, mi amor']), 'deleting removes the phrase and its progress');
    await pm.reload(); await appReady(pm);
    ok(await pm.evaluate(() => myPhrases.length === 1 && 'mine' in DECKS), 'My phrases are saved');
    // another profile has its own list; import brings phrases across
    const code = await pm.evaluate(() => encodeProgressBlob({ progress: { 'mine/¿Me pasas el control?': { box: 2, due: 9e12, seen: 5 } }, custom: myPhrases }));
    await pm.evaluate(() => Profiles.logout());
    await pm.click('#addProfileBtn'); await pm.fill('#nameInput', 'Alex'); await pm.click('#saveProfileBtn');
    ok(await pm.evaluate(() => myPhrases.length === 0 && !('mine' in DECKS)), "another profile doesn't see Sam's phrases");
    await pm.evaluate(code => applyImport(code), code);
    ok(await pm.evaluate(() => myPhrases.length === 1 && state.progress['mine/¿Me pasas el control?'].box === 2), 'import brings My phrases and their progress');
    await mctx.close();
  }

  { // 31. new decks, Why? notes and conversations
    const cctx = await newCtx();
    await cctx.addInitScript(() => {
      window.__said = [];
      speechSynthesis.speak = u => { window.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 5); };
    });
    const pc2 = await cctx.newPage();
    pc2.on('pageerror', e => { console.log('PAGEERROR-C2', e.message); fails++; });
    await pc2.goto(URL); await appReady(pc2);

    const content = await pc2.evaluate(() => {
      const problems = [];
      BUILT_IN_DECKS.forEach(k => {
        const d = DECKS[k], seen = new Set();
        if (!d.color || !DECK_BADGES[d.icon]) problems.push(k + ': badge');
        if (d.levels.length !== 3) problems.push(k + ': levels');
        d.levels.forEach(l => { if (l.cards.length !== 10) problems.push(k + ' ' + l.label + ': ' + l.cards.length + ' cards');
          l.cards.forEach(c => { if (!c.es || !c.en || !c.pron || !ICONS[c.icon]) problems.push(k + ': incomplete ' + c.es);
            if (seen.has(c.es)) problems.push(k + ': duplicate ' + c.es); seen.add(c.es); }); });
      });
      const original = ['everyday', 'love', 'family', 'food'].reduce((n, k) => n + deckCards(k).filter(c => c.why).length, 0);
      const convos = Object.keys(CONVERSATIONS).map(k => [k, CONVERSATIONS[k]]);
      convos.forEach(([k, list]) => { if (!DECKS[k]) problems.push('conversation for unknown deck ' + k);
        list.forEach(cv => { if (!cv.id || !cv.title || cv.lines.length < 4 || cv.lines.some(l => !['you','them'].includes(l[0]) || !l[1] || !l[2])) problems.push('conversation ' + k + '/' + cv.id); }); });
      return { decks: BUILT_IN_DECKS.length, cards: BUILT_IN_DECKS.reduce((n, k) => n + deckCards(k).length, 0), original, problems,
               convoDecks: convos.filter(([, l]) => l.length).length };
    });
    ok(content.decks === 11 && content.cards === 330, '11 decks, 330 phrases (' + content.cards + ')');
    ok(content.problems.length === 0, 'every deck and card is complete: ' + content.problems.slice(0, 5).join('; '));
    ok(content.original === 120, 'all 120 original phrases have a Why? note');
    ok(content.convoDecks === 11, 'every deck has a conversation');

    // Why? on the back of a flashcard
    await pc2.evaluate(() => { const cards = activeCards(); state.order = [cards.findIndex(c => c.es === '¿Qué onda?')]; state.idx = 0; render(); });
    ok(await pc2.isHidden('#whyNote'), 'Why? note hidden until asked');
    await pc2.click('.card-word'); await pc2.click('#whyBtn');
    ok(await pc2.isVisible('#whyNote') && (await pc2.textContent('#whyNote')).includes('wave'), 'Why? explains the phrase');
    ok(await pc2.evaluate(() => document.getElementById('flipCard').classList.contains('flipped')), 'tapping Why? keeps the card flipped');
    // Why? in quiz answers
    await pc2.evaluate(() => { state.mode = 'quiz'; state.quizType = 'reverse'; state.practice = true; resetDeckState(); const cards = activeCards(); state.order = [cards.findIndex(c => c.es === '¿Qué onda?')]; render(); });
    await pc2.click('#optsWrap .opt-btn:text-is("¿Qué onda?")');
    ok((await pc2.textContent('.quiz-reveal')).includes('Why?'), 'quiz answers include the Why? note');

    // Conversations tab
    await pc2.click('#modeTalk');
    ok((await pc2.$$('.talk-line')).length === 6 && (await pc2.textContent('.talk-title')) === 'Coming home', 'Conversations shows the deck\'s first dialogue');
    ok(await pc2.isHidden('.talk-en'), 'English hidden by default');
    await pc2.click('#talkEn');
    ok(await pc2.isVisible('.talk-en'), 'Show English reveals translations');
    await pc2.evaluate(() => { __said.length = 0; });
    await pc2.click('#talkPlay');
    await pc2.waitForFunction(() => __said.length === 6, null, { timeout: 5000 });
    ok(await pc2.evaluate(() => __said[0] === 'Ya llegué.' && __said[5] === 'Órale, no hay bronca.'), 'Play all reads every line in order');
    await pc2.click('.talk-line >> nth=2');
    ok(await pc2.evaluate(() => __said[__said.length - 1].startsWith('Bien, pero')), 'tapping a line plays it');
    await pc2.click('#talkFinish');
    const talk = await pc2.evaluate(() => ({ done: state.stats.convosDone['everyday/home'], today: state.stats.days[Challenges.dayKey(Date.now())].convos, title: document.querySelector('.talk-title').textContent }));
    ok(talk.done && talk.today === 1 && talk.title.startsWith('Weekend plans'), 'finishing records it and moves to the next conversation');
    await pc2.click('.deck-btn:has-text("Celebrations")');
    ok((await pc2.textContent('.talk-title')).startsWith('A birthday'), 'each deck has its own conversations');
    await cctx.close();
  }

  { // 32. Progress page, trickiest phrases, calendar reminder
    const gctx = await newCtx(); const pg2 = await gctx.newPage();
    pg2.on('pageerror', e => { console.log('PAGEERROR-G', e.message); fails++; });
    await pg2.clock.install({ time: new Date('2026-09-29T09:00:00') });
    await pg2.goto(URL); await appReady(pg2);
    // a few answers today, two of them wrong on the same phrase
    await pg2.evaluate(() => {
      const cards = activeCards();
      recordAnswer(cards[0]._id, true); recordAnswer(cards[1]._id, false); recordAnswer(cards[1]._id, false); recordAnswer(cards[2]._id, false);
    });
    ok(await pg2.evaluate(() => state.stats.misses['everyday/' + activeCards()[1].es]) === 2, 'wrong answers are counted per phrase');
    await pg2.click('#chipBtn'); await pg2.click('#menuProgress');
    ok((await pg2.textContent('.panel-title')) === 'Your progress', 'Progress page opens from the menu');
    ok((await pg2.$$('.cal-grid .cal-cell')).length === 35 && !!(await pg2.$('.cal-cell.today.s1')), 'calendar shows 5 weeks with today shaded');
    ok((await pg2.$$('.bar-col')).length === 14, '14 days of bars');
    await pg2.click('.bar-col >> nth=13');
    ok((await pg2.textContent('#barReadout')).includes('1 correct'), 'tapping a bar shows its exact count');
    ok((await pg2.$$('.prog-decks li')).length === 11, 'every deck listed');
    const trickyFirst = await pg2.textContent('.voice-row .voice-es');
    ok(trickyFirst === await pg2.evaluate(() => activeCards()[1].es) && (await pg2.textContent('.miss-count')).includes('2'), 'most-missed phrase is listed first');
    // calendar reminder file
    await pg2.fill('#reminderTime', '07:30'); await pg2.dispatchEvent('#reminderTime', 'change');
    const ics = await pg2.evaluate(() => decodeURIComponent(document.getElementById('reminderLink').href.split(',').slice(1).join(',')));
    ok(ics.includes('RRULE:FREQ=DAILY') && ics.includes('DTSTART:20260930T073000') && ics.includes('BEGIN:VALARM') && ics.includes('\r\n'),
       'reminder is a daily calendar event with an alert, starting at the next 7:30');
    ok(await pg2.$eval('#reminderLink', a => a.getAttribute('download')) === 'spanish-practice.ics', 'reminder downloads as a calendar file');
    // practise the tricky ones
    await pg2.click('#practiseTricky');
    ok(await pg2.isVisible('#main') && (await pg2.textContent('#reviewBanner')).includes('trickiest'), 'Practise these starts a round of tricky phrases');
    const pool = await pg2.evaluate(() => activeCards().map(c => c._id));
    ok(pool.length === 2 && await pg2.evaluate(() => state.order.length) === 2, 'the round holds just the tricky phrases');
    await pg2.click('#exitTrickyBtn');
    ok(await pg2.evaluate(() => state.tricky === null && activeCards().length === 10), 'Back to your decks ends the tricky round');
    await gctx.close();
  }

  { // 33. search
    const sctx = await newCtx(); const ps = await sctx.newPage();
    ps.on('pageerror', e => { console.log('PAGEERROR-S2', e.message); fails++; });
    await ps.goto(URL); await appReady(ps);
    await ps.click('#searchBtn');
    ok((await ps.textContent('.panel-title')) === 'Search' && (await ps.textContent('#searchHint')).includes('accents are optional'), 'search opens from the header');
    const first = async q => { await ps.fill('#searchInput', q); await ps.waitForTimeout(250); return ps.evaluate(() => [...document.querySelectorAll('.search-row .voice-es')].map(e => e.textContent)); };
    let r = await first('extrano');
    ok(r[0] === 'Te extraño' && r.includes('Los extraño mucho'), 'Spanish search ignores accents: ' + r.slice(0, 3).join(', '));
    r = await first('miss you');
    ok(r.includes('Te extraño'), 'English search works');
    r = await first('QUE ONDA');
    ok(r[0] === '¿Qué onda?', 'exact phrase comes first, ignoring case and ¿?');
    r = await first('zzzz');
    ok(r.length === 0 && (await ps.textContent('#searchHint')).includes('No phrases match'), 'no results says so');
    r = await first('aguinaldo');
    ok(r[0] === 'El aguinaldo', 'finds phrases in locked levels of other decks');
    await ps.click('.search-main');
    ok(await ps.isVisible('.search-detail') && (await ps.textContent('.search-status')).includes('locked level') && (await ps.textContent('.search-detail')).includes('Why?'),
       'tapping a result shows pronunciation, Why? and where it is');
    await ps.click('[data-act="practise"]');
    ok(await ps.isVisible('#main') && await ps.evaluate(() => activeCards().length === 1 && activeCards()[0].es === 'El aguinaldo'), 'Practise opens a round with that phrase');
    ok((await ps.textContent('#reviewBanner')).includes('from your search'), 'the round is labelled');
    await ps.click('#searchBtn');
    ok((await ps.inputValue('#searchInput')) === 'aguinaldo', 'search remembers the last query');
    await sctx.close();
  }

  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exitCode = fails ? 1 : 0;
})();
