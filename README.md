# Aprende Conmigo

A Spanish flashcard app for real Mexican Spanish — everyday phrases, terms of
endearment, family and food — with spaced repetition, so each phrase comes back
just as it's about to be forgotten.

**Open it:** https://scottirwin85.github.io/aprende-conmigo/

## Put it on an iPhone

1. Open the link above in **Safari**.
2. Tap **Share → Add to Home Screen**.

It then opens full-screen from its own icon, like an app. Progress is saved on
the phone.

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

## How it's built

| File | What it does |
|---|---|
| `content.js` | Decks, levels and cards |
| `srs.js` | Spaced-repetition schedule: 10 min → 1 day → 3 days → 1 week → 2 weeks → 1 month → 3 months |
| `challenges.js` | Daily challenges (3 new each day), the day streak and achievements |
| `profiles.js` | Profiles on the device: welcome screen, who's practising, PIN |
| `app.js` | Screens, greeting, levels, quiz, export/import |
| `storage.js` | Saves progress (browser storage, Claude artifact storage, or Scriptable) |
| `build.py` | Bundles everything into one page: `dist/site/` (website), `dist/spanish-app.html` (single file), `dist/Aprende Conmigo.js` (Scriptable) |
| `tests/app.test.js` | Browser tests, run automatically before each publish |

To run it locally: `npm install && npx playwright install chromium`, then
`npm run build && npm test`. Or open `index.html` in a browser.
