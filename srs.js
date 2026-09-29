// srs.js — a small Leitner-style spaced repetition system.
// Each card gets a {box, due, seen} record. box runs 0..MAX_BOX; seen is when
// it was last answered (used to merge progress from other devices).
// A correct answer on a card that is due pushes it up a box and further into
// the future. A correct answer on a card that isn't due yet changes nothing —
// otherwise tapping through a level a few times in a row would skip the
// whole schedule. A wrong answer (or "Not yet") drops it back two boxes and
// makes it due now, so one slip doesn't wipe out weeks of progress.
const SRS = (function () {
  const MIN = 60 * 1000, DAY = 24 * 60 * MIN;
  // ms until next due date, indexed by the box just reached
  const INTERVALS_MS = [
    0,          // box 0 — due immediately
    10 * MIN,   // box 1 — 10 minutes
    1 * DAY,    // box 2 — 1 day
    3 * DAY,    // box 3 — 3 days
    7 * DAY,    // box 4 — 1 week
    14 * DAY,   // box 5 — 2 weeks
    30 * DAY,   // box 6 — 1 month
    90 * DAY,   // box 7 — 3 months (re-extends by 3 months each further correct answer)
  ];
  const MAX_BOX = INTERVALS_MS.length - 1;
  const WRONG_DROP = 2; // boxes lost on a wrong answer

  function blank() { return { box: 0, due: 0 }; } // due 0 = always due (never studied)

  function isDue(card, now) { return !card || card.due <= now; }

  function promote(card, now) {
    if (!isDue(card, now)) return card; // early review: keep the existing schedule
    const box = Math.min((card && card.box || 0) + 1, MAX_BOX);
    return { box, due: now + INTERVALS_MS[box], seen: now };
  }

  function demote(card, now) {
    return { box: Math.max(0, (card && card.box || 0) - WRONG_DROP), due: now, seen: now };
  }

  function answer(card, correct, now) {
    return correct ? promote(card, now) : demote(card, now);
  }

  function dueOf(card) {
    return card ? card.due : 0; // unseen cards sort first
  }

  // Guards data that comes from storage or an imported code.
  function isValidRecord(rec) {
    const num = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
    return !!rec && typeof rec === 'object' &&
      Number.isInteger(rec.box) && rec.box >= 0 && rec.box <= MAX_BOX &&
      num(rec.due) && (rec.seen === undefined || num(rec.seen));
  }

  // Which of two records for the same card to keep when merging progress:
  // the one answered most recently, so forgetting a card on one device isn't
  // undone by an older, stronger record from another. Records saved before
  // `seen` existed fall back to the stronger one.
  function newer(a, b) {
    if (typeof a.seen === 'number' || typeof b.seen === 'number') {
      return (a.seen || 0) >= (b.seen || 0) ? a : b;
    }
    return a.box > b.box || (a.box === b.box && a.due >= b.due) ? a : b;
  }

  return { MAX_BOX, INTERVALS_MS, blank, isDue, promote, demote, answer, dueOf, isValidRecord, newer };
})();
