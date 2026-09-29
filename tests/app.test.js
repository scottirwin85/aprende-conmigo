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
  const ctx = await browser.newContext();
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
  const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage();
  p2.on('pageerror', e => { console.log('PAGEERROR2', e.message); fails++; });
  await p2.goto(URL);
  await p2.evaluate(() => { localStorage.setItem('progress', JSON.stringify({'everyday:0:0': {box: 3, due: 1e15}, 'love:2:9': {box:1, due: 5}})); localStorage.setItem('streak','7'); });
  await p2.reload();
  const mig = await p2.evaluate(() => JSON.parse(localStorage.getItem('progress')));
  ok(mig['everyday/¿Qué onda?'] && mig['everyday/¿Qué onda?'].box === 3 && mig['love/Para siempre y un día más'], 'legacy positional ids migrated');
  await p2.click('#importBtn'); await p2.fill('#importBox', code); await p2.click('#applyImportBtn');
  ok((await p2.textContent('#syncPanel')).includes('Imported progress for'), 'import success message');
  ok(await p2.evaluate(() => isDeckFinished('everyday')), 'import carries unlocks');

  // 11. Scriptable bridge
  const ctx3 = await browser.newContext(); const p3 = await ctx3.newPage();
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
  const ctx4 = await browser.newContext(); const p4 = await ctx4.newPage();
  await p4.addInitScript(() => { window.storage = { get: async () => null, set: async () => { throw new Error('nope'); } }; });
  await p4.goto(URL); await p4.click('#knowBtn'); await p4.waitForTimeout(100);
  ok(await p4.evaluate(async () => Storage.backend === 'artifact' && !!(await Storage.get('progress'))), 'artifact write failure still readable');
  // 13. scheduling: wrong answers drop two boxes, gaps grow to 3 months
  const ctx5 = await browser.newContext(); const p5 = await ctx5.newPage();
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
    const ctxS = await browser.newContext(); const pS = await ctxS.newPage();
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
  for (const [t, es, en] of [['08:30', '¡Buenos días!', 'Good morning'], ['15:00', '¡Buenas tardes!', 'Good afternoon'],
                            ['20:00', '¡Buenas noches!', 'Good evening'], ['02:00', '¡Buenas noches!', 'It’s late']]) {
    const pg = await browser.newPage();
    await pg.clock.install({ time: new Date('2026-09-29T' + t + ':00') });
    await pg.goto(URL);
    const g = await pg.textContent('#greeting');
    ok(g.includes(es) && g.includes(en) && g.includes('40 phrases ready'), 'greeting at ' + t + ': ' + es + ' / ' + en);
    await pg.close();
  }

  // 18-22. daily challenges, streak, achievements
  const pc = await browser.newPage();
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
  ok(await pc.evaluate(() => state.stats.listenedTotal) === listenBefore + 1, 'tapping 🔊 counts as listening');
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

  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exitCode = fails ? 1 : 0;
})();
