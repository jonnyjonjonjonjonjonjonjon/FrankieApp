# Frankie's Diary

A shared visual diary and calendar for Frankie: words + symbols, large type, tap to tick things off. The design source of truth is [`PRD.md`](PRD.md) (v0.5). This code covers the **Phase 1 MVP** screens, running locally on one device; cross-device sync is the main piece still to build (see below).

## Run

Needs Node 20.19+ (Vite 8).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build + PWA service worker in dist/
npm run preview    # serve dist/
npm run lint
```

Installable as a PWA (Android tablet, Chrome/Edge on Windows). Everything is stored in the browser's IndexedDB, so each device currently has its own copy of the diary.

## What is built (PRD §4)

| PRD | Where |
|---|---|
| 4.1 Home: now / next tiles, big 12-hour clock with am/pm + sun/moon and analogue face, tab bar | `components/today/`, `components/ui/Clock.tsx`, `components/ui/TabBar.tsx` |
| 4.2 Week table Mon–Sun: staying-at, breakfast/lunch/dinner with food, events; birthdays band | `components/week/WeekView.tsx` |
| 4.3 Month grid, today in orange, indicators, year picker (this year + next) | `components/month/` |
| 4.4 Day view: date, staying-at, ordered events, big tick box (animation + vibration), routine template, meals → food picker, When/Where/Who pickers, ratings, photo strip | `components/day/`, `components/pickers/` |
| 4.5 Tiles: word + symbol, photo badge, tap the symbol to flip to the photo (remembered per tile) | `components/ui/Tile.tsx` |
| 4.6 "+ Add" everywhere; add-to-day with no typing; new word = Word → Picture (symbol grid with search and/or photo) → Done | `components/day/AddEventFlow.tsx`, `components/pickers/NewItemForm.tsx` |
| 4.9 Birthdays (set on a person in family settings) | day / week / month views |
| 4.10 Gallery grouped by day, newest first, tap to jump to the day | `components/photos/GalleryView.tsx` |
| 4.11 Starting lists | `lib/seed.ts` |
| §6 Undo instead of confirm dialogs; family mode behind a PIN (routine times, home, words, deletions, other minutes in the time picker, export, start again) | `components/ui/Toast.tsx`, `components/settings/SettingsView.tsx` |

Symbols are **emoji placeholders** until Makaton licensing is confirmed (PRD §11.6); swapping in a licensed symbol set means replacing the `symbol` strings and `lib/symbols.ts`.

## Not built yet

- **Sync between devices (4.12, Phase 1 "sync between tablet and Jon's phone").** The store (`lib/store.ts`, `lib/db.ts`) keeps every record with `updatedAt` and soft `deleted` flags so a Firestore/Supabase adapter can replay them last-write-wins. Needs a project + credentials before it can be wired up.
- Trips (4.8), photo import via the Android share target, change tracking with green-tick acceptance (4.7), rating insights — Phases 2–3.

## Code layout

```
src/
  types.ts              data model
  lib/
    db.ts               IndexedDB (idb) stores
    store.ts            in-memory state + all mutations; template days materialise on first edit
    seed.ts             starting lists (PRD 4.11)
    symbols.ts          event types, rating faces, symbol grid for new words
    dates.ts, time.ts   date helpers; 12-hour / half-hour time helpers
    images.ts           image shrinking + object-URL cache
  components/
    ui/                 Tile, BigButton, Sheet, TopBar, TabBar, Clock, Toast, PinPad…
    pickers/            ItemPicker, NewItemForm, TimePicker, RatingPicker, PhotoInput
    today/ week/ month/ day/ photos/ settings/
public/icons/           app icon (icon.svg is the source; PNGs rendered from it)
```
