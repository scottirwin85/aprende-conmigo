# Aprende Conmigo

A Spanish flashcard app for real Mexican Spanish — 330 phrases in 11 decks
(everyday, love, family, food, numbers & time, feelings, around the house, out &
about, texting & slang, meeting the family, celebrations) — with spaced repetition, so each phrase comes back
just as it's about to be forgotten.

**Open it:** https://scottirwin85.github.io/aprende-conmigo/

**How to install and use it (for anyone):** https://scottirwin85.github.io/aprende-conmigo/guide.html

## Put it on an iPhone

1. Open the link above in **Safari**.
2. Tap **Share → Add to Home Screen**.

It then opens full-screen from its own icon, like an app. Progress is saved on
the phone.

## Why? notes and conversations

- Most phrases have a **Why?** note (on the back of the flashcard, and after
  quiz answers) explaining how the phrase works — add `why:"…"` to a card.
- The **Conversations** tab has short dialogues for each deck. Tap a line to
  hear it, or **Play all**; **Show English** reveals the translations.
  Dialogues live in `conversations.js`.

## Quiz types

Pick them from the **Questions** menu in the Quiz tab. **Mixed** (the default)
chooses for you and gets harder as a card gets stronger:

| Card strength | Questions |
|---|---|
| New | Spanish → English |
| Seen once | Spanish → English, English → Spanish, Listening |
| Known | English → Spanish, Listening, Fill the gap, What would you say?, Build the phrase |
| Strong | Type it, Build the phrase, What would you say?, Fill the gap, Listening (+ Say it out loud, if turned on) |

- **Type it** forgives missing accents, punctuation and a small typo, then shows the proper spelling.
- **Say it out loud** uses the phone's speech recognition; it's experimental and may not work on every device.
- **Match the pairs** is a timed warm-up game. It doesn't change when cards come back.

## Difficulty (Nivel)

Pick **Fácil**, **Normal** or **Difícil** above the cards; each profile keeps its own choice.
It changes how questions are asked, never how often cards come back.

| | Fácil | Normal | Difícil |
|---|---|---|---|
| Pronunciation guide | shown | shown | hidden until the answer |
| Choices per question | 3 | 4 | 5 |
| Audio | slower | normal | natural speed |
| Typing | accents and a couple of typos forgiven | accents and a small typo forgiven | accents and spelling must be right |
| Build the phrase | the phrase's words | the phrase's words | plus 2 decoy words |
| Mixed mode | harder types come later | as above | harder types come sooner |
| Match the pairs | 4 pairs | 5 pairs | 6 pairs |

## Search

The magnifying glass at the top searches every phrase (all decks and My
phrases) in Spanish or English — accents and ¿¡ are optional. Tap a result to
see how to say it, its Why? note and your progress, then hear it, share it, or
practise it straight away.

## Your progress

**Your progress** (in the menu under your name) shows your streak, a 5-week
practice calendar, correct answers per day, every deck's progress, and your
**trickiest phrases** (the ones you miss most) with a button to practise just
those. **Daily reminder** adds a repeating "Spanish practice" event with an
alert to the phone's calendar (a phone notification would need a server).

## My phrases

**My phrases** (in the menu under your name) is for the things you really say
at home: Spanish, English, and optionally how to say it and when you'd say it.
They become a "My phrases" deck for that profile, with the same reviews and
quizzes as everything else, and travel with Export/Import.

## Your voice, and sharing phrases

- **Record phrases in your voice** (in the menu under your name): record a
  phrase and every speaker button plays your recording instead of the
  phone's voice. Recordings stay on the phone (shared by all its profiles).
- **Share this phrase** on the back of a flashcard sends it through the
  phone's share sheet (Messages, WhatsApp, …).

## Offline and dark mode

Once the app has been opened with a connection, it also opens without one
(`sw.js` keeps a copy on the phone and picks up new versions whenever it's
online). Dark mode follows the phone's own setting.

## Profiles

The first time it opens, the app asks for a name (and an optional 4-digit PIN).
Everyone who uses the same phone can have their own profile — each with their
own progress, streak and challenges. Tap your name at the top to switch
profiles or change your name or PIN.

Profiles only exist on that device; nothing is sent anywhere. The PIN just
stops someone opening the wrong profile by accident — it isn't a password, and
a forgotten PIN can't be recovered (the profile can be deleted instead). To move progress between devices, use **Export progress** on one and
**Import progress** on the other.

## Changing the phrases

All phrases are in [`content.js`](content.js). Edit it on GitHub (the pencil
icon) and commit — the site rebuilds, re-runs the tests and updates itself in a
couple of minutes. If a test fails, the old version stays live; the **Actions**
tab shows what went wrong.

- Add a card anywhere in a level: `{es:"…", pron:"…", en:"…", icon:"star"}`.
- Progress is keyed by the Spanish text (`es`). If you change a card's `es`,
  add `was:"<the old text>"` to the card to keep its progress.
- Icons available: see `ICONS` at the bottom of `content.js`.
- Add `ctx:"<a real-life situation>"` to a card to use it in the
  **What would you say?** quiz. Write it so the card's phrase is the natural reply.

## How it's built

| File | What it does |
|---|---|
| `conversations.js` | Short dialogues for the Conversations tab |
| `content.js` | Decks, levels and cards |
| `srs.js` | Spaced-repetition schedule: 10 min → 1 day → 3 days → 1 week → 2 weeks → 1 month → 3 months |
| `challenges.js` | Daily challenges (3 new each day), the day streak and achievements |
| `profiles.js` | Profiles on the device: welcome screen, who's practising, PIN |
| `quiz.js` | Quiz question types, Mixed mode, answer checking, Match the pairs |
| `app.js` | Screens, greeting, levels, export/import |
| `storage.js` | Saves progress (browser storage, Claude artifact storage, or Scriptable) |
| `voice.js` | Your own recordings: record, store (IndexedDB), play |
| `sw.js` | Offline support: keeps a copy of the app on the phone |
| `build.py` | Bundles everything into one page: `dist/site/` (website), `dist/spanish-app.html` (single file), `dist/Aprende Conmigo.js` (Scriptable) |
| `tests/app.test.js` | Browser tests, run automatically before each publish |

To run it locally: `npm install && npx playwright install chromium`, then
`npm run build && npm test`. Or open `index.html` in a browser.
