# Frankie's Diary

A shared visual diary and calendar for Frankie: words + symbols, large type, tap to tick things off. The design source of truth is [`PRD.md`](PRD.md) (v0.5). This code covers the **Phase 1 MVP** screens plus cloud sync via Firebase (see below).

## Run

Needs Node 20.19+ (Vite 8).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build + PWA service worker in dist/
npm run preview    # serve dist/
npm run lint
```

Installable as a PWA (Android tablet, Chrome/Edge on Windows). Everything is stored in the browser's IndexedDB and, once Firebase is configured, kept in sync across devices.

## What is built (PRD §4)

| PRD | Where |
|---|---|
| 4.1 Home: now / next tiles, big 12-hour clock with am/pm + sun/moon and analogue face, tab bar | `components/today/`, `components/ui/Clock.tsx`, `components/ui/TabBar.tsx` |
| 4.2 Week table Mon–Sun: staying-at, breakfast/lunch/dinner with food, events (travel as "Bus ➜ place"), photo previews; birthdays band with faces; the day/date row stays at the top when scrolling | `components/week/WeekView.tsx` |
| 4.3 Month grid, today in orange, per-day markers (staying away, doctor/dentist, visitors, birthday cake + whose face); centred title with arrows either side; months slide side to side like days | `components/month/` |
| 4.4 Day view: date, staying-at, an ordered list with a small + between rows (and above the first, below the last) that opens an add card right there, so adding never leaves the day (press and hold a row, or grab its grip, to drag it; a tap still opens it; times are optional via the clock button, and a timed row dragged out of sequence loses its time along with the rows it clashes with), routine template, meals → food picker, Travel (bus, train, taxi, car, plane, boat) → Where to?, shown on one line "Bus ➜ Swimming pool", When/Where/Who pickers, ratings, photo strip; days slide side to side | `components/day/`, `components/pickers/` |
| 4.5 Tiles: word + symbol, photo badge, tap the symbol to flip to the photo (remembered per tile) | `components/ui/Tile.tsx` |
| 4.6 "+ Add" everywhere; add-to-day with no typing; pickers on shelves (tabs for People: Family / Staff / Friends, Food by meal plus Fruit / Treats / Drinks, Activities: Home / Out / Active / Fun / Friends / Relax; "All" shows every shelf); new word = Word → Shelf → Picture (symbol grid with search and/or photo) → Yes; question screens answer with thumbs-up Yes / thumbs-down No (and Clear to take a value away) | `components/day/InlineAdd.tsx`, `components/pickers/` (`ChoiceGrid`, `NewItemFields`, `PictureChooser`), `lib/categories.ts` |
| 4.9 Birthdays: Family settings → Birthdays (soonest first; month, then day; optional year born shows the age on the day band) | `components/settings/Birthdays.tsx`, `components/pickers/MonthDayPicker.tsx`; day / week / month views |
| Words: Family settings → Words, by kind and shelf: rename, change picture or shelf, stay / doctor-or-dentist for places, reorder with arrows, remove and restore | `components/settings/WordsManager.tsx`, `WordEditor.tsx` |
| 4.10 Gallery grouped by day, newest first, tap to jump to the day | `components/photos/GalleryView.tsx` |
| 4.11 Starting lists | `lib/seed.ts` |
| No pinch zoom; a crash shows the diary book and reloads once (after an update check) instead of a white screen | `index.html`, `lib/noZoom.ts`, `components/ui/ErrorBoundary.tsx` |
| §6 Undo instead of confirm dialogs; family mode behind a PIN (routine times, home, words, deletions, other minutes in the time picker, export, start again) | `components/ui/Toast.tsx`, `components/settings/SettingsView.tsx` |

Symbols are **emoji placeholders** until Makaton licensing is confirmed (PRD §11.6); swapping in a licensed symbol set means replacing the `symbol` strings and `lib/symbols.ts`.

## Cloud sync (PRD 4.12)

Sync runs on Firebase: Firestore for the diary and the photo bytes (no Cloud Storage, so no billing account is needed), Google sign-in for access. It is switched on by pasting the Firebase web config into `src/lib/firebaseConfig.ts`; with `null` there the app runs on one device only.

How it works (`src/lib/sync.ts`):

- IndexedDB stays the source the screens read from, so everything works offline. Every local write is pushed to Firestore (the SDK queues writes while offline) and every remote change is written back locally, last-write-wins on `updatedAt`.
- Photos are shrunk to stay under Firestore's 1 MB document limit, upload from an outbox that retries when the device comes online, and download on demand on other devices.
- Access is by Google account: the signed-in email must be listed in the `members` collection. `firestore.rules` enforces it. Members are managed in Family settings → Family accounts; the very first member is added in the Firebase console.
- Frankie's tablet signs in once (with a family account) and stays signed in.
- Start-up never out-stamps the cloud: a fresh install writes its starting lists silently with old timestamps and runs no migrations, and on a device with sync configured, tidy-ups for older diaries wait until every collection's first snapshot from the server has been applied.

The app is published to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main` (served under `/FrankieApp/`, see `base` in `vite.config.ts`). Firestore rules are pasted into the Firebase console (or deployed with `firebase deploy --only firestore:rules`).

## Not built yet

- Trips (4.8), photo import via the Android share target, change tracking with green-tick acceptance (4.7), rating insights, family notifications — Phases 2–3.

## Code layout

```
src/
  types.ts              data model
  lib/
    db.ts               IndexedDB (idb) stores
    store.ts            in-memory state + all mutations; template days materialise on first edit
    seed.ts             starting lists (PRD 4.11)
    symbols.ts          event types, rating faces, symbol grid for new words
    categories.ts       shelves per kind; categoryOf() places older records at read time
    dates.ts, time.ts   date helpers; 12-hour / half-hour time helpers
    images.ts           image shrinking + object-URL cache
    sync.ts             Firebase sync adapter (auth, members, Firestore, Storage outbox)
    firebaseConfig.ts   paste the Firebase web config here to switch sync on
  components/
    ui/                 Tile, BigButton, Sheet, TopBar, TabBar, Clock, Toast, PinPad…
    pickers/            ItemPicker (ChoiceGrid in a Sheet), NewItemForm (NewItemFields), PictureChooser, MonthDayPicker, TimePicker, RatingPicker, PhotoInput
    auth/               sign-in gate (only shown when sync is configured)
    today/ week/ month/ day/ photos/ settings/
firestore.rules, firebase.json, .github/workflows/deploy.yml
public/icons/           app icon (icon.svg is the source; PNGs rendered from it)
```
