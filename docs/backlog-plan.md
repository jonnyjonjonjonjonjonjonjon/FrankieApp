# Backlog plan — September 2026

The design for the owner's 16-item backlog, split into five build batches.
It is written for two readers:

- **The builder**: exact files, types, migrations, symbols and tests for each batch.
- **The owner**: what each item will look like for Frankie, what was decided by
  default, and what needs your input (the questions are at the end).

Frankie's needs set every decision here: she is deaf, has very low vision, reads
single words and knows Makaton. So the app uses big targets, one word per
button, a symbol on everything, strong contrast and no sound. Her Galaxy Tab A8
(1280×800, mostly landscape) comes first. Family phones (412×915) get the same
screens in a more compact size (all sizes are in rem: 14px root on phones,
18px at `sm`, 20px from 900px).

Every symbol name in this document was checked against
`public/symbols/mulberry/` (or the OpenMoji source folder for the two new
emoji, see §2.4).

---

## 1. Feasibility of all 16 items

| # | Item | Feasible? | Notes |
|---|------|-----------|-------|
| 1 | Disable pinch zoom | **Yes** | Viewport meta + CSS `touch-action` (+ `gesturestart` / ctrl-wheel guards for iPad and laptops; no document-wide touch listener, which would slow scrolling on the Tab A8). Chrome's accessibility setting "Force enable zoom" overrides it, and Android's own Magnification gesture still works, so Frankie can still magnify if someone switches that on for her. |
| 2 | Pictures from the web (Google safe search) | **Yes, but not from Google without a key** | Google's only official image search API (Custom Search JSON API) is closed to new customers and needs an API key, a search-engine id and billing. Scraping Google Images from a web app is blocked by CORS and by Google's terms. Google has also announced that the API will close for existing customers (around January 2027), and a key would sit in the synced settings where every family member can read it. We build the exact UX the owner asked for on a **pluggable provider** with one source, **Openverse** (free, no key, `mature=false` filters content flagged as adult, openly licensed pictures). Openverse's filter is flag-based and weaker than Google SafeSearch, so by default the web box shows **only in Family mode** (Q1). Its browser access (CORS) for thumbnails can't be tested from the build machine, so the box fails quietly and this is reported as untested. |
| 3 | Categories for people, food, activities | **Yes** | New optional `category` field, worked out at read time for older records (no data migration, so no sync conflicts, see §2.1). People: Family / Staff / Friends. Food and activities: see §4. |
| 4 | Thumbs up Yes / thumbs down No | **Yes** | Mulberry has `good` (thumbs up) and `bad` (thumbs down). |
| 5 | Usage stats in Family settings | **Yes** | Counted on each device (counts only, no content), synced as one small doc per device per day, and summarised in Family settings. |
| 6 | Travel (bus, train, taxi, car, plane, boat) + destination | **Yes** | New event type `travel` and library kind `travel`, with the destination held in the event's existing place field. Shown on one line: "Bus → Swimming pool". |
| 7 | "+" between items, adding without leaving the day | **Yes** | An inline "composer" card opens in the list at that spot, with its breadcrumb and Yes/No kept on screen while its tiles scroll. The bottom Add button and the separate add screens go away. The + slots cost 3rem per row, but the Add bar's height comes back: the landscape tablet still opens on two whole rows, and shows 2.6 rows a screen instead of 2.9 once scrolled (measured, §6.7). |
| 8 | Hold an item to drag it | **Yes** | Press and hold for about 0.45 s, the row lifts, then drag. A short tap still opens the row. Moving before the hold completes still scrolls or swipes. Chrome decides at touch-start whether it may scroll, so this needs a permanent touch listener on the list (§6.4). The headless tests can't fully copy Chrome's touch handling on Android, so **the real check is on Frankie's tablet**. |
| 9 | Week view: days/dates stay at the top | **Yes** | A sticky header row inside the week's scroll area. |
| 10 | Remove the Year button | **Yes** | The Year button and the year picker are removed. |
| 11 | Centred month title with arrows either side | **Yes** | |
| 12 | Months slide like days | **Yes** | Reuse the day carousel, including the Galaxy Tab A8 ghosting fix. |
| 13 | Christmas, Easter, Halloween shown in day/week/month | **Yes** | Easter is worked out for each year. |
| 14 | Birthdays managed in Family settings, visible everywhere | **Yes** | Birthdays already live on person items. The new work is a Birthdays section and a friendly day/month picker. Birthdays already show in day, week and month views; they get a little richer. |
| 15 | Simple way to edit/manage words | **Yes** | A "Words" section in Family settings with an edit screen per word (rename, picture, category, hide/remove, reorder). |
| 16 | Encourage new choices ("Try something new") | **Yes** | A curated list of Mulberry foods/activities she doesn't have yet, with a search and a looping picture demo showing how to search. |

Nothing on the list is blocked. Item 2 is the only one that can't use the named
supplier (Google): its API needs a key the owner would have to create, is closed
to new sign-ups and is being wound down.

**One condition for going live**: batch 1 must be **published on its own, and
every device updated to it**, before anything from batch 2 onwards is published
(§10, Q19). The copy of the app already on Frankie's tablet crashes on a travel
event; batch 1 adds the guards and a safety net that recovers from crashes.

---

## 2. Cross-cutting decisions (apply to every batch)

### 2.1 Migrations and sync: never out-stamp the cloud

**The flaw in today's code** (fixed in batch 1, because every later batch relies
on it). Sync is last-write-wins on `updatedAt`: `sync.applyRemote` drops a cloud
record whose stamp is not newer than the local one. But:

- `StoreProvider` runs `store.load()` (which awaits `migrate()`) **before**
  `sync.start()`. Migrations therefore run on the device's possibly stale local
  copy. The write hooks are still `null`, so nothing is pushed, but every
  `updateItem` / `updateSettings` stamps *now*. When the first snapshot
  arrives, every cloud version edited before that moment loses. A rename,
  photo or removal made elsewhere is lost on that device for good.
- A **fresh install** (a new family phone) seeds items at epoch, but
  `DEFAULT_SETTINGS` has no `templateVersion`. The whole v1→v5 chain runs, v3
  calls `updateItem` on every seed and `updateSettings` writes the template,
  all stamped *now*. The new phone then ignores the cloud's seed edits **and the
  cloud settings** (no PIN, default routine), until someone edits them again. If
  that edit happens on the new phone, it overwrites the family's settings.

**Rules from now on:**

1. **Boot and seed writes are silent and epoch-stamped** (as `load()` already
   does for seeds), so any cloud version wins.
2. **A fresh install runs no migration.** In `load()`, when the item store is
   empty, the boot settings also get `templateVersion: CURRENT_TEMPLATE_VERSION`
   (a constant at the top of `store.ts`, currently `5`), written silently with
   the same old stamp as `homePlaceId` (`new Date(1)`). The seeds already have
   the current shape (categories and travel included from batch 2).
3. **When sync is configured, migrate only after the first server snapshot.**
   - `StoreProvider` calls `store.load({ migrate: !sync.enabled })`.
   - In `sync.listen()`, for each collection, remember whether the first
     snapshot with `!snap.metadata.fromCache` has arrived, and collect the
     promises of the `applyRemote` calls it made. Once **all five collections**
     have one, `await Promise.all(...)` and call `store.syncedOnce()`. That sets
     a flag and runs `migrate()`.
   - `store.applyRemote('settings')` still calls `migrate()`, but only once that
     flag is set.
   - By then every local record is at least as new as the cloud's, so a
     migration's *now* stamps
     behave like a family edit made after seeing the current data, and they
     sync normally (the write hooks are set by then).
   - A device that is offline or signed out just doesn't migrate until it
     connects. The screens must render old shapes anyway (rule 5), so nothing
     breaks.
   - With sync off (`VITE_SYNC=off`, or no Firebase config), `load()` migrates
     straight away as now.
4. **Re-entry guard**: `load` and `applyRemote` can both start `migrate()`.
   Keep one in-flight promise: `migrate() { return (this.migrating ??=
   this.runMigrations().finally(() => { this.migrating = null })) }`.
5. **New fields are resolved at read time, not written by a migration.**
   - Batch 2 adds **no v6 migration** and does not bump `templateVersion`.
   - `categoryOf()` resolves a missing `category` (§2.3).
   - The travel seeds are added by `ensureSeeds()`, which `load()` calls every
     time. It writes any **missing** `seed-travel-*` item exactly like the boot
     seeds: epoch stamp, `db.putItems(missing, true)`. If the family has already
     edited or removed one in the cloud, that version is newer and wins when it
     arrives. Seeds are never pushed until someone edits them, just as now.
   - `category` is written only when the family edits a word (WordEditor,
     NewItemForm, Try).
6. The chain stays linear, with behaviour identical for v1-v5:

```ts
const version = s.templateVersion ?? 1
if (version >= CURRENT_TEMPLATE_VERSION) return
if (version < 3) { /* existing v2+v3 block, unchanged */ }
if (version < 4) await this.migrateV4()
if (version < 5) await this.migrateV5()
```

(The v2/v3 block ends by writing `templateVersion: 3`, and each `migrateVn`
writes `templateVersion: n`, exactly as now.) Every step stays **idempotent**:
it only fills in fields that are missing and never overwrites family edits. A
future step that must write data follows rules 3 and 4.

**Old app versions on other devices.** The PWA auto-updates, checked hourly
and on every start. But the copy of the app that will first meet a travel
event is **the one already installed** on Frankie's tablet, not batch 1. Deploy
is "push to `main`", so if the whole branch is merged at once, batch 1's guards
ship in the same build as travel. A phone that updates first and adds "Bus"
would then crash the tablet's old build on `EVENT_TYPES['travel'].word`. There
is no error boundary today, so Frankie would see a white screen. Hence:

- **Batch 1** makes the readers tolerant:
  `EVENT_TYPES[ev.type] ?? EVENT_TYPES.activity` everywhere an event type is
  looked up (`eventFace`, `WeekView`, `EventSheet`, `AddEventFlow`,
  `SettingsView`'s routine list). Library lists only use known kinds already.
- **Batch 1** adds a top-level **ErrorBoundary** (§3.5): it shows the book
  symbol, asks the service worker for an update, then reloads once.
- **Release order** (§10, Q19): publish batch 1 alone. Wait until every device
  shows its version number on the day screen (at least a few days, with
  Frankie's tablet checked by hand). Only then publish batch 2 or later, which
  are the first to write a new event type or library kind.

### 2.2 Yes / No buttons (item 4) — the pattern used everywhere

New file `src/components/ui/YesNo.tsx`:

```tsx
export function YesButton({ onClick, disabled, word = 'Yes' }: …)  // green, mb:good
export function NoButton({ onClick, word = 'No' }: …)              // white, ink border, mb:bad
```

- Both are `BigButton size="lg"`. The symbol sits in a white rounded square
  (`bg-paper rounded-xl p-1`) at `text-5xl`, so the thumb reads clearly on the
  green Yes. The word is on an inner `<span className="text-2xl">`, because the
  global `button { font: inherit }` rule overrides text sizes set on the button.
- Order in every footer: **No on the left, Yes on the right** (bottom-right,
  where her right index finger goes). Any "clear" action sits at the far left,
  with a clear gap (`mr-auto`) between it and No.
- **Screens that are a question** (pickers and forms) swap their header Back
  button for the No button in the footer. That way one screen never has two
  ways to cancel. Add a `hideBack?: boolean` prop to `Sheet`.
- **Navigation screens** keep Back: EventSheet (changes save straight away),
  photo viewer, "Add to routine", Settings.
- Single-choice pickers (tap a tile = choose) have only No in the footer.
- **Clearing a value** (the Where? picker's "None", the time picker's "No
  time") becomes one button: the word **"Clear"** with Mulberry `mb:remove-to`
  (a hand taking a square away). It never starts with "No", and the thumbs-down
  is used only on No, so a single-word reader can't mix them up (Q9). New
  `ClearButton` in `YesNo.tsx` (white, `border-line`, `size="lg"`).

### 2.3 Categories (items 3, 15, 16) — one model for all kinds

- `LibraryItem.category?: string`: the id of one category, per kind.
- New file `src/lib/categories.ts` holds the lists and a resolver:

```ts
export interface Category { id: string; word: string; symbol: string }
export const CATEGORIES: Partial<Record<LibraryKind, Category[]>> = { person: [...], food: [...], activity: [...] }
/** The item's category, or a sensible default for records written by older versions. */
export function categoryOf(item: LibraryItem): string | null
export function categoriesFor(kind: LibraryKind): Category[]
```

- `categoryOf` resolves in this order, and **nothing is written** (§2.1 rule 5):
  1. `item.category`, if set and still a known id for that kind.
  2. `SEED_CATEGORY[item.id]`: a map exported from `seed.ts`, built from the
     `category` in each `SeedSpec`. Seeded words on existing diaries have no
     `category` field, and without this step every seeded activity would fall
     into "Home".
  3. The fallback for user-made words. A person uses `role` (carer→staff,
     friend→friends, family→family, else friends). A food uses `meals[0]`
     (breakfast/lunch/dinner as is, treat→treats, drink→drinks, else dinner).
     An activity uses `home`.

  The screens never depend on a migration, and words added by an old client
  still land somewhere sensible.
- `role` and `meals` stay in the type, marked deprecated. Stop writing `role` on
  new people and stop sorting the food picker by `meals`. `meals` is still
  written for new foods from a meal picker, so old clients keep their ordering.
- Places and travel have no categories. They are short lists, and places
  already have `placeType` and `stayable`.

### 2.4 Symbols

- Prefer `mb:` Mulberry names, which are all bundled. Only two new emoji are
  needed (batch 5): ✨ `2728` (Try) and 🔍 `1F50D` (Find, used in the demo).
  Copy them from
  `/tmp/claude-0/-home-user/3d2ff7cf-c421-5daf-894a-bd94790edf65/scratchpad/om/package/color/svg/2728.svg`
  and `…/1F50D.svg` into `public/symbols/openmoji/`.
- The full list of symbols chosen is in §9.

### 2.5 Content-first components

Several screens now need to appear **either** as a full-screen Sheet (EventSheet
edits, Family settings) **or** inside the day's inline composer (batch 3). Build
them as content components with a thin Sheet wrapper:

| Content component | Built in | Sheet wrapper used by |
|---|---|---|
| `ChoiceGrid` (tiles + category tabs + New tile; Try tile only when an `onTry` prop is passed) | batch 2 | `ItemPicker` |
| `NewItemFields` (word, category, picture) | batch 2 | `NewItemForm` |
| `PictureChooser` (preview + Camera/Photos + symbol search; the web box slot) | batch 2 | used by `NewItemFields` and `WordEditor` |
| `TryNewPanel` | batch 5 | `TryNew` sheet |

Batch 3's inline New depends on batch 2's `NewItemFields`. Batch 3 passes no
`onTry`, so no Try tile appears until batch 5 adds `TryNewPanel` and wires it
into both `ItemPicker` and the composer.

### 2.6 Testing conventions (every batch)

- Put scripts and screenshots in
  `/tmp/claude-0/-home-user/3d2ff7cf-c421-5daf-894a-bd94790edf65/scratchpad/gauntlet/<batch>/`.
- Build with `VITE_SYNC=off npx vite build`. Serve with
  `npx vite preview --port <PORT> --strictPort` in the background, and kill it
  by PID afterwards.
- Viewports: tablet 1280×800, tablet portrait 800×1280, phone 412×915.
- The visible day is `page.locator('main div.shrink-0.h-full').nth(1)`. Keep the
  carousel panel classes `h-full w-full shrink-0 overflow-hidden` so this
  selector keeps working.
- Fixed dates: `await page.clock.install({ time: new Date('2026-12-25T10:00:00') })`
  before `goto`.
- Touch gestures: `const cdp = await page.context().newCDPSession(page)` and
  `Input.dispatchTouchEvent` (touchStart / touchMove / touchEnd) with
  `hasTouch: true` contexts. Use `page.mouse` for the pointer-only paths.
- A seeded older diary for migration tests. Do **not** seed from
  `addInitScript`: that races the app's own `openDB` and boot seeding. Instead:
  1. Load the app once, so the database exists at the current version.
  2. In `page.evaluate`, `indexedDB.open('frankies-diary')` **without** a version
     number, then overwrite the records with older-shaped ones (store names and
     keys as in `db.ts`).
  3. Reload.

  Or build the previous commit, load it once on the same origin and port, then
  switch to the new build.
- Unit-style checks of pure modules (`festive.ts`, `categories.ts`, `ideas.ts`):
  there is no `tsx` or `esbuild`, and `dist` is bundled. Bundle the module with
  `npx rolldown src/lib/festive.ts --format esm --file <scratchpad>/festive.mjs`
  and `import()` it from a node script in the scratchpad. The module must not
  import anything that touches `window` or `idb`.
- Synthetic events whose `defaultPrevented` is checked need `cancelable: true`.
- After each batch: `npx tsc -b`, `npx eslint src`, then look at every
  screenshot with the Read tool.

---

## 3. Batch 1 — Quick UI wins and a safety net (items 1, 4, 10, 11, 12, 9)

### 3.1 No pinch zoom (item 1)

- `index.html` viewport:
  `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content`.
  The last part makes `h-dvh` shrink when the soft keyboard opens (Chrome's
  default only resizes the visual viewport), so typing in the day's add card
  (New, Try's Find box) stays visible above the keyboard.
- `src/index.css`: `html, body { touch-action: pan-x pan-y; }`. The allowed
  touch actions are intersected up to the root, so this removes pinch-zoom even
  inside buttons with `touch-action: manipulation`. The carousel (`pan-y`) and
  the drag grip (`none`) are unaffected. The CSS also covers Samsung Internet
  when its "Manage website zoom" setting overrides `user-scalable`.
- New file `src/lib/noZoom.ts`, called once from `main.tsx`. It adds two
  listeners on `document`, and **no `touchmove` listener**: a permanent
  non-passive `touchmove` on the document would make every scroll in the app
  wait for the main thread, which lags on the Tab A8 whenever React is busy.
  - `gesturestart` → `preventDefault()` (Safari/iPad).
  - `wheel` (`{ passive: false }`) with `e.ctrlKey` → `preventDefault()`
    (trackpad pinch on laptops).
  - Keyboard zoom (Ctrl +/−) stays: it is family-only and helps sighted relatives.

### 3.2 Yes / No everywhere Done/Cancel appear (item 4)

Build `YesNo.tsx` and add `Sheet.hideBack` (§2.2). Replace in:

| File | Change |
|---|---|
| `pickers/ItemPicker.tsx` | Footer: `[Clear (allowNone only)] … [No] [Yes (multi only)]`, `hideBack` |
| `pickers/NewItemForm.tsx` | Footer: `[No] [Yes disabled until valid]`, `hideBack` |
| `pickers/TimePicker.tsx` | Footer: `[Clear (was No time)] … [No] [Yes]`, `hideBack` |
| `day/AddEventFlow.tsx` | Type step: `[No]`, `hideBack` (the whole flow goes in batch 3) |
| `day/EventSheet.tsx` | The place `ItemPicker` keeps `allowNone`, which now shows Clear |

### 3.3 Month screen: no Year button, centred title, slide (items 10, 11, 12)

- Delete `src/components/month/YearPicker.tsx` and every use of it. The title
  is no longer a button.
- New header in `MonthView.tsx`, **not** `TopBar`'s left title. It is one
  centred row, `flex items-center justify-center gap-3 border-b-4 border-line px-3 py-1 sm:py-2`:
  `[‹ BigButton] [title] [› BigButton]`.
  - Title: `<span>{monthName}</span> <span className="text-ink-soft">{year}</span>`,
    `text-xl sm:text-3xl font-extrabold`, `min-w-[9.5em] text-center`, so the
    arrows don't move when the month name changes (September is the longest).
  - The arrows stay `aria-label="Month before" / "Month after"`.
- **Slide**: move `src/components/day/DayCarousel.tsx` to
  `src/components/ui/SlideCarousel.tsx`, renamed `SlideCarousel`, with the same
  code and comments. Its `centre` is any string key. Add one prop,
  `locked?: boolean`, which ignores touches (used in batch 3). `DayView` imports
  the new file.
  - `MonthView` keeps `slide` state like `DayView`:
    `<SlideCarousel centre={date.slice(0,7)} request={slide} onSettle={dir => goMonth(addMonths(date, dir))} render={o => <MonthGrid date={addMonths(date, o)} />} />`.
    The arrows set `slide`. The `useSwipe` on the month root goes.
  - Move the grid into `MonthGrid` (same file). Each panel is
    `h-full overflow-y-auto p-2`, so small landscape phones can still scroll.
  - **Ghosting fix kept**: the track stays keyed by `centre` and is remounted
    when it lands, with no resting transform. Do not "improve" this.
- **Performance**: three month panels call `store.eventsFor(d)` for about 126
  days, and each call scans every event. Add a memoised
  `store.eventsByDate(): Map<ISODate, DiaryEvent[]>`, rebuilt only when the
  `events` object identity changes. `eventsFor` then uses it (it still adds the
  virtual template and sorts). This keeps the Tab A8 smooth.

### 3.4 Week view: sticky day header (item 9)

- `WeekView.tsx`: split each day's header button out of its column card into a
  separate row of seven, **inside** the same `overflow-auto` container, so
  horizontal scrolling on phones keeps them lined up:

```
<div className="flex-1 overflow-auto p-3 pt-0">
  <div className="min-w-[1080px]">
    <div className="sticky top-0 z-10 grid grid-cols-7 gap-2 bg-paper pt-3 pb-0">  ← headers
    <div className="grid grid-cols-7 gap-2">                                       ← bodies
```

- Headers: `rounded-t-[1.25rem] border-4 border-b-0`. Bodies: `rounded-b-3xl
  border-4 border-t-0`, with the same colours (orange for today). The seam must
  look like one card, so check it on the screenshot.
- Decision: sticky in **every** orientation. It costs about 4.5rem and never
  hurts. The owner asked for landscape; see Q7.
- The header row also gets the festive symbol from batch 4 (a small slot now).

### 3.5 Safety net: tolerant readers, crash recovery, safe boot (for all later batches)

- **Tolerant readers**: the `?? EVENT_TYPES.activity` guards from §2.1.
- **ErrorBoundary**: new file `src/components/ui/ErrorBoundary.tsx`, a class
  component (the only one in the app, since React has no hook for this). It
  wraps everything inside `StoreProvider` in `App.tsx`.
  - On error, it shows the 📖 book symbol at `text-8xl`, the same as the loading
    screen, so Frankie sees nothing alarming. It logs the error to the console.
  - Recovery: `navigator.serviceWorker.getRegistration()` → `update()`, then
    `location.reload()` once the update settles or after 4 s, whichever comes
    first.
  - **Loop guard**: before reloading, it writes a timestamp to `sessionStorage`
    (`frankies-diary-crash-reload`, in try/catch). If it already reloaded less
    than 60 s ago, it does not reload again. It stays on the book, retries
    `update()` every 5 minutes, and shows a small family-sized "Again" button
    (lucide `RotateCw` icon, reloads on tap) under the book.
- **IndexedDB upgrade handlers** in `db.ts` `openDB`, ready for any future
  version bump: `blocking() { db.close(); location.reload() }` (an old tab
  lets a newer one upgrade) and `terminated() { location.reload() }`. Batch 5
  does **not** bump the main database (usage gets its own, §8.2), so this is
  only a precaution.
- **Safe boot and migration timing**: §2.1 rules 1-4 (fresh install gets
  `templateVersion` at boot, migrate after the first server snapshot when sync
  is on, single in-flight `migrate()`). These fix today's code and must be
  published before anything else changes stored data.

### 3.6 Batch 1 tests

1. `document.querySelector('meta[name=viewport]').content` contains
   `user-scalable=no`, and `getComputedStyle(document.documentElement).touchAction`
   is `pan-x pan-y`. Dispatch a `wheel` event with `ctrlKey` from
   `page.evaluate` and assert `defaultPrevented`.
2. Open Add → Lunch: the footer shows "No" and "Yes" with `img[src$="good.svg"]`
   / `bad.svg`, and there is no header Back. Tap No and it closes. The clock
   button on a row → Yes sets the time. Take screenshots on tablet and phone.
3. Month: no text "Year". The title's bounding-box centre is within 8px of the
   viewport centre. The left arrow's right edge is left of the title, and the
   right arrow is to its right. Take screenshots on tablet, portrait and phone.
4. Month slide: click "Month after" and take a screenshot about 120ms later (two
   months part-way). After it settles, the title is the next month and the track
   element's `style.transform` is `''`. Do a CDP touch swipe right-to-left of
   200px as well.
5. Week (1280×800): scroll the week container by 500px. The header row's `top`
   equals the container's `top`. Take screenshots before and after, and on phone
   portrait scroll both ways.
6. Regression: day swipe and arrows still work, and the drag grip still reorders.
7. **Fresh boot doesn't out-stamp the cloud**: new context, load, then read
   IndexedDB in `page.evaluate`. Every `seed-*` item has `updatedAt` equal to
   `1970-01-01T00:00:00.000Z`. `settings.updatedAt` is at most
   `1970-01-01T00:00:00.001Z`. `settings.templateVersion` is 5. Reload and
   check again.
8. **v5 diary is left alone**: write v5-shaped records (method in §2.6), note
   every record's `updatedAt`, reload twice. No `updatedAt` changed, and
   `templateVersion` is still 5 (idempotent). A v4 diary (`templateVersion: 4`,
   one seed with its v4 emoji) is migrated to 5 exactly once.
9. **Unknown event type**: write an event with `type: 'zzz'` to IndexedDB and
   reload. Day, Week and Month render (the row shows as an Activity), and there
   is no white screen.
10. **ErrorBoundary**: make one render throw. For example, write an event whose
    `people` is a string rather than an array, if that throws; otherwise add a
    temporary throw in a local build that is **not committed**. The book symbol
    shows, the page reloads once, and after a second crash within 60 s it stays
    on the book with "Again".


### 3.7 Batch 1 as built (deviations from the design above)

- **No goes back one step, like the Back it replaces.** In Add → Lunch, No
  returns to the Add screen; No there closes it. (Test 2 checks exactly this.)
- **Event-type lookups** go through one helper, `eventTypeInfo(type)` in
  `symbols.ts`, rather than repeating `EVENT_TYPES[t] ?? EVENT_TYPES.activity`.
- **Clear** uses a new `BigButton` variant `quiet` (white, `border-line`):
  a `border-line` class on top of `secondary`'s `border-ink` is an
  order-dependent Tailwind conflict.
- NewItemForm's small **"No photo"** button became **"Clear"** (with
  `mb:remove-to`), so no button other than No starts with "No" (Q9).
- **Yes / No / Clear words** sit on inner spans with their own weight and
  colour. The global `button { font: inherit; color: inherit }` rule in
  `index.css` is unlayered, so it beats Tailwind's `font-*`, `text-*` and
  `text-white` on any `<button>`. This is older than the backlog and affects
  other buttons too (e.g. the orange "today" month cell and the selected tab
  show black, not white, words). It was **left alone** in batch 1: fixing it
  (moving the rule into `@layer base`) changes the look of every button, so it
  should be a deliberate, screenshot-checked change of its own.
- **Week headers** use `rounded-t-3xl` (not `1.25rem`): each header now has its
  own border, so it takes the column card's outer radius. On phones,
  `index.css` shrinks `.border-4` to 2px with an unlayered rule, which would
  also re-open `border-t-0` / `border-b-0`; the phone block now keeps those at 0.
- **Sync's first-snapshot check** listens with `includeMetadataChanges: true`.
  Without it Firestore never reports a cached snapshot being confirmed by the
  server when nothing changed, so `syncedOnce()` could wait forever.
- **Migration flag**: `load({ migrate })` records whether migrations may
  run; "Start again" reloads with the same setting.
- `ErrorBoundary` also refuses to auto-reload when `sessionStorage` can't hold
  the loop-guard stamp (private modes), so it can never reload in a loop.
- `useSwipe.ts` was deleted: the month was its last user.

---

## 4. Proposed categories (item 3)

### 4.1 People

| id | Word | Symbol | Seeded items |
|---|---|---|---|
| `family` | Family | `mb:family` | Mum, Dad, Liz, Ria, Jon |
| `staff` | Staff | `mb:care_assistant_1a` | Tara |
| `friends` | Friends | `mb:hug-to` | (none yet) |

### 4.2 Food — by meal, the way Frankie thinks of her day

Frankie picks food *for a meal*. So the shelves are the meals she already knows,
plus three kinds that aren't a meal. The meal picker opens on **"All"**, as it
does today every food is visible, with **the meal's own shelf first** (Lunch
shows the Lunch section at the top, then the others). The shelf tabs are an
extra shortcut, not a hidden layer: Cake is still on the first screen under
Treats (Q20).

| id | Word | Symbol | Seeded items |
|---|---|---|---|
| `breakfast` | Breakfast | `mb:breakfast_1` | Toast, Cereal, Porridge, Eggs |
| `lunch` | Lunch | `mb:lunch_1` | Sandwich, Soup, Jacket potato, Beans on toast |
| `dinner` | Dinner | `mb:dinner_hot` | Pasta, Pizza, Fish and chips, Roast dinner, Curry, Sausages and mash |
| `fruit` | Fruit | `mb:fruit` | (none yet; filled by Try something new) |
| `treats` | Treats | `mb:sweet` | Cake, Ice cream, Biscuits, Chocolate |
| `drinks` | Drinks | `mb:drink` | Tea, Juice, Water |

"Fruit" covers fruit and vegetables. The word stays single, and vegetables
sit in the same shelf.

### 4.3 Activities

| id | Word | Symbol | Seeded items |
|---|---|---|---|
| `home` | Home | `mb:house` | Computer, Sleeping |
| `out` | Out | `mb:go_outside-to` | Food shopping, Clothes shopping |
| `active` | Active | `mb:exercise-to` | Walk, Swimming |
| `fun` | Fun | `mb:party_celebration` | (none yet) |
| `friends` | Friends | `mb:meet-to` | Seeing friends |
| `relax` | Relax | `mb:relax-to` | (none yet) |

Pickers **hide empty shelves** (except in Family → Words, where every shelf is
listed). So Fun, Relax and Fruit appear as soon as something is added to them.

---

## 5. Batch 2 — Library model: categories, Travel, birthdays, managing words (items 3, 6, 14, 15)

Publish only after batch 1 is live on every device (§2.1, §10).

### 5.1 Types (`src/types.ts`)

```ts
export type LibraryKind = 'person' | 'place' | 'food' | 'activity' | 'travel'

export interface LibraryItem {
  …
  /** Shelf within its kind (see lib/categories.ts). Missing on records from older versions: use categoryOf(). */
  category?: string
  /** Year of birth, optional; shows her age on the birthday band. */
  birthYear?: number | null
  /** @deprecated since the categories change — use category. */ role?: PersonRole
  /** @deprecated for grouping (use category); still written for meal pickers. */ meals?: MealSlot[]
}

export type EventType = … | 'activity' | 'travel'

export interface DiaryEvent {
  …
  /** For type === 'travel': how she's going (a 'travel' library item). Where to = placeId. Missing on old records = null. */
  travelId?: Id | null
}
```

### 5.2 Seeds (`src/lib/seed.ts`)

- `SeedSpec` gains `category?: string`, set for every person, food and activity
  as in §4 (Tara → `staff`). `seedItems()` copies it. Export
  `SEED_CATEGORY: Record<Id, string>`, built from `SEED`, for `categoryOf()`.
- Append the travel seeds **at the end of `SEED`**. Seed `order` is the array
  index, so appending keeps every existing order the same:

| id | Name | Symbol |
|---|---|---|
| `seed-travel-bus` | Bus | `mb:bus` |
| `seed-travel-train` | Train | `mb:train` |
| `seed-travel-taxi` | Taxi | `mb:taxi` |
| `seed-travel-car` | Car | `mb:car` |
| `seed-travel-plane` | Plane | `mb:aeroplane` |
| `seed-travel-boat` | Boat | `mb:ferry` |

  (`mb:ferry` rather than `mb:boat`, which is a sailing dinghy. See Q5.)

### 5.3 No v6 migration (see §2.1 rule 5)

- `templateVersion` stays **5**, and nothing in this batch rewrites stored
  records on load.
- `store.ensureSeeds()` (called by `load()` after the boot seeding) adds any
  missing `seed-travel-*` item with the epoch stamp, silently. It is idempotent,
  because it only adds ids that are missing locally.
- Categories come from `categoryOf()` (§2.3). `category` is stored only when
  the family saves a word.
- Fresh installs get the travel seeds and `category` on every seed straight
  from `seedItems()`, still epoch-stamped.

### 5.4 Symbols and words (`src/lib/symbols.ts`)

- `EVENT_TYPES.travel = { word: 'Travel', symbol: 'mb:travel' }`.
- `EVENT_TYPE_ORDER = ['activity', 'travel', 'breakfast', 'lunch', 'dinner', 'shower', 'teeth', 'wake', 'bed']`.
  Travel sits beside Activity at the top level.
- `KIND_WORD.travel = 'Travel'` and `KIND_SYMBOL.travel = 'mb:travel'`.
- Settings "Add to routine" filters out `travel` as well as `activity`.
- `eventFace()`: a travel event with its item → the mode's word, symbol and
  photo. Without an item → "Travel" + `mb:travel`.

### 5.5 Store (`src/lib/store.ts`)

- `addEvent` input gains `travelId`. Set `travelId: null` on every new event and
  on the virtual template events.
- `addItem`: stop adding `role: 'friend'`; set `category` from `extra`, or the
  kind's first category. Keep `birthday: null` for people.
- `itemsOfKind(kind, category?)`: optional filter. The sort becomes
  `(order ?? 1e6)`, then name. It is the same for seeded items and puts user
  items after them by name until someone reorders.
- `reorderItems(ids: Id[])`: writes `order = i * 10` for the given list (used by
  manage words). Only touch items whose order changed.
- `restoreItem(id)`: `deleted: false`.
- `deletedOfKind(kind)`: for the "Removed" list.
- `birthdaysOn(date)`: also match `02-29` on 28 February in non-leap years.
- `upcomingBirthdays(from: ISODate)`: people with a birthday, sorted by next
  occurrence, with `daysAway` and the `age` they turn (if `birthYear`).

### 5.6 Travel in the current add flow (item 6)

This batch builds the data and the picking. Batch 3 moves it inline.
`AddEventFlow.tsx` gains two steps for Travel:

1. **"Travel"**: `ItemPicker kind="travel"` (single choice). Tiles: Bus, Train,
   Taxi, Car, Plane, Boat, + New.
2. **"Where to?"** (symbol `mb:where`): `ItemPicker kind="place"`, single
   choice (tapping a place finishes). The footer is `[No] [Yes]`, and here
   **Yes adds the travel with no destination** ("Bus" on its own). The header
   shows the chosen mode, so Yes reads as "yes, the bus". A new
   `ItemPicker` prop `onSkip` shows that Yes on a single-choice picker.
3. Finish: `addEvent({ type: 'travel', travelId, placeId })`, toast "Bus added".

**Showing it on one line** (`EventRow.tsx`): for travel events the title line is

```
[big mode symbol]  Bus  ➜  [pool symbol] Swimming pool          [clock]
```

- Word: `text-3xl font-extrabold`. The lucide `ArrowRight` is 36px (`strokeWidth={3}`),
  then the destination symbol at `text-3xl` and name at `text-3xl font-bold`, all
  in one `flex flex-wrap items-center gap-x-2` line.
- On narrow phones a long destination wraps under the word as a whole unit (a
  `whitespace-nowrap` group for arrow + symbol + name), so it never breaks mid-name.
- The place is **not** repeated in the sub-line below for travel events.

Elsewhere:

- `EventSheet` for travel: rows "Travel" (the mode) → `ItemPicker kind="travel"`,
  and "Where to?" (placeId) → places with Clear. There is no separate
  "Where?" row.
- `WeekView` "others" list: mode symbol box + time. Word "Bus", then a second
  line "➜ Swimming pool" (`text-base font-bold`) with a small destination
  symbol. It is too narrow for one line.
- `MonthView`: unchanged (see Q16).
- Old clients: a travel event shows as a plain Activity row (batch 1 guard), and
  travel items are never listed, because old screens only list known kinds.

### 5.7 Categories in the pickers (item 3)

In `ChoiceGrid` (extracted from `ItemPicker`, §2.5):

- **Category tabs** above the grid, only when the list has **two or more
  non-empty** shelves. They sit in a horizontal row
  (`flex gap-3 overflow-x-auto`, `data-noswipe`). Each tab is a `BigButton`
  with its symbol at `text-4xl` and its word; the selected tab is `primary`
  (orange). The first tab is **"All"**. Its picture is a 2×2 mosaic of the
  first four shelf symbols (Mulberry's `lots_more` / `every` are too abstract
  for her).
- The **initial tab is always "All"**. In "All", the grid is split into
  sections with a header band per shelf (`text-2xl font-extrabold`, symbol
  `text-4xl`), so the whole list can still be scanned. A meal picker puts **its
  own shelf's section first** (Lunch → Lunch section, then Breakfast, Dinner,
  Fruit, Treats, Drinks), so today's "meal's foods first" order is kept.
- Search ("Find", shown when there are more than 12 items) searches across all
  shelves and ignores the tab.
- The **New** tile passes the current tab's category (in "All": the meal's
  shelf, else the kind's first shelf) to
  `NewItemForm`. `NewItemForm` shows the category as a row of toggle buttons
  that the family can change. Default: the one passed in.
- Selected items from several shelves stay selected while switching tabs (multi).

### 5.8 Birthdays in Family settings (item 14)

New section **"Birthdays"** (🎂) near the top of `SettingsView`, in
`src/components/settings/Birthdays.tsx`:

- A list of upcoming birthdays, soonest first. Each row is
  `[face 4rem] Name · 3 March · in 12 days` (plus "turns 70" if the year is set).
  Tap a row → edit.
- **"Add birthday"** (primary):
  1. Pick the person with `ItemPicker kind="person"`, which offers New. A new
     person is added to her people like any other, in the Family shelf by default.
  2. Pick the date with the new `MonthDayPicker`.
  3. Optionally enter the year born.
  4. Yes.
- Edit: the same date picker, plus "No birthday" (clears it) and Yes/No.
- New file `src/components/pickers/MonthDayPicker.tsx` (Sheet, `hideBack`):
  - Step 1: 12 month buttons in a 3×4 grid (`BigButton size="lg"`, full names on
    tablets, `Jan`…`Dec` under `sm`).
  - Step 2: day numbers in a 7-column grid for that month (29 for February), and
    tapping the month name at the top returns to step 1.
  - Optional "Year born" numeric input (4 digits, family only).
  - Footer: No / Yes.
  - Value format: `MM-DD`, as now.
- The old inline `<input type="date">` in `WordRow` goes (the whole `WordRow`
  list is replaced in 5.9). The birthday is also editable from the word editor.

**Visible in all views** (already true; batch 4 double-checks it):

- Day: the band stays. Add the age as a number badge when `birthYear` is set.
- Week: the band shows faces (photo or symbol at `text-3xl`) next to the names,
  not names alone.
- Month: cake + the first person's face, so she sees *whose* birthday it is.

### 5.9 Managing words (item 15)

This replaces the four long `KINDS.map(...)` lists in `SettingsView` with one
**"Words"** section (symbol `mb:pencil`). The new files are
`src/components/settings/WordsManager.tsx` and
`src/components/settings/WordEditor.tsx`.

- **Kind tabs**: People · Places · Food · Activities · Travel (symbol + word
  buttons).
- **List grouped by shelf** (header per category; places and travel have one
  plain list). Each row has:
  - picture (4rem), name (`text-2xl font-extrabold`)
  - a small category chip
  - **up/down arrow buttons** to reorder within the shelf, which calls
    `reorderItems` with the shelf's ids (cheap, and no drag in admin)
  - a chevron: the whole row opens the editor.
- **"Add"** (primary) opens `NewItemForm` for that kind, with the current shelf
  preselected.
- **"Removed"**: a collapsed list of soft-deleted words for that kind, each with
  **Restore**. This undoes a removal long after the 7-second toast.
- **WordEditor** (Sheet, `hideBack`, footer No / Yes). Edits are held in local
  state until Yes:
  - **Name**: big text input.
  - **Picture**: the shared `PictureChooser` (extract it from `NewItemForm`:
    preview + Camera/Photos + symbol search grid; batch 5 adds the web box). A
    new photo is kept as a Blob until Yes, then `setItemPhoto`. There is also
    "No photo" and a toggle "Show photo first" (the `showPhoto` flag).
  - **Shelf**: category toggle buttons (people/food/activity).
  - **Person**: Birthday button → `MonthDayPicker`.
  - **Place**: "Frankie can stay here" toggle (`stayable`) and "Doctor or
    dentist" toggle (`placeType: 'medical'`, which drives the month-view 🩺).
  - **Remove** (danger, left of the footer): `deleteItem` (soft delete + Undo toast).
- The Home and Daily routine sections are unchanged.

### 5.10 Sync

No new collections. Items and events carry the new fields through the existing
`items` and `events` collections. `ignoreUndefinedProperties` is already on.

### 5.11 Edge cases

- An old client edits an item: it spreads `...cur`, so `category` survives.
- An old client adds a person: the new client shows it via `categoryOf` → from
  `role`.
- A travel mode or destination later removed (soft delete): the row still shows
  the name, because `items[id]` still exists. If it is truly missing, show
  "Travel" and hide the arrow.
- A travel event with no place: just "Bus".
- A birthday on 29 February (see 5.5). Two people on one day: both on the band.
- Reordering in a shelf when user items have no `order`: `reorderItems` writes
  every item in that shelf.

### 5.12 Batch 2 tests

1. **No stamped writes on an existing diary**: write a v5-shaped diary using
   the §2.6 method (no `category`, no travel items, `templateVersion: 5`, one
   user food with `meals: ['treat']`, one user person with `role: 'carer'`, and
   one user activity). Note every record's `updatedAt`, then reload. Assert:
   - `templateVersion` is still 5, and **no existing record's `updatedAt`
     changed**. No record has `category` written.
   - Six `seed-travel-*` items exist, each with `updatedAt` at epoch.
   - Through the UI: Toast is under the Breakfast shelf, Tara under Staff, Walk
     under Active (not Home), the user food under Treats, the user person under
     Staff, and the user activity under Home.
   - Reload again: nothing changes (idempotent).
   - **Fresh boot**: in a new context, every seed (travel included) has an
     epoch `updatedAt` and a `category`, and `settings.updatedAt` is not bumped.
2. **Pickers**: Add → Lunch opens on "All" with the Lunch section first
   (Sandwich is the first tile) and Cake visible further down under Treats. Tap
   the "Treats" tab → only treats show. Pick Sandwich + Cake → Yes → the row
   shows both.
   People picker: tabs Family / Staff show, Friends is hidden (empty). Take
   screenshots on tablet and phone.
3. **Travel**: Add → Travel → Bus → Where to? → Swimming pool. The row text
   includes "Bus" and "Swimming pool", and the title-line element's height is
   one line (≤ 1.6 × its font size) at 1280×800. Take screenshots on tablet and
   phone (with a long destination such as "Jon's house"). Also check the week
   column and EventSheet rows "Travel" and "Where to?". Add → Travel → Taxi →
   Yes (no place) → the row says "Taxi" with no arrow.
4. **Birthdays**: Family (set a PIN) → Birthdays → Add → Mum → March → 3 → Yes.
   The list shows "Mum · 3 March". The day view on 3 March shows the band, week
   shows the face and month shows cake + face. Take screenshots.
5. **Words**: Food tab → Toast → rename "Toasty", move it to Lunch, Yes → the
   Lunch picker shows Toasty. Remove → Undo. Remove → Removed list → Restore.
   Up/down arrows swap Toast/Cereal and the picker order follows.

### 5.13 Batch 2 as built (deviations from the design above)

- **Shelf tabs are small vertical tiles** (picture above the word, `BigButton
  size="sm"`, `gap-2`). With the picture beside the word, a food list's seven
  tabs (All + six shelves) overflowed 1280px and hid Drinks off-screen; stacked,
  all seven fit across the tablet. Phones still scroll the row sideways.
- **Tabs are not sticky.** The batch-3 composer has its own sticky header at
  `top-0`, and "All" already shows every shelf, so the tabs scroll with the tiles.
- **`ChoiceGrid` is controlled** (`selected`, `onPick`, `onNew(category)`); the
  tab and Find text are its own state. `ItemPicker` keeps the selection and the
  New form. `NewItemFields` is controlled too: the draft type and its helpers
  (`newDraft`, `draftReady`, `saveDraft`) live in `pickers/newItemDraft.ts`, so
  batch 3's composer can own the draft and put Yes / No in its own footer.
- **New foods also get the old meal tag of their shelf** (`SHELF_MEAL`: Treats
  → `treat`, Drinks → `drink`, …; Fruit has none, so it falls back to the meal
  the picker was opened for). Older copies keep sorting their meal pickers.
- **New words get the kind's first shelf** (people: Family) unless a shelf is
  passed, from `addItem`; the New form shows the shelf as radio buttons
  (Word → Shelf → Picture). `role` is no longer written.
- **Where to?** shows the chosen mode through a new `Sheet` prop `before`
  (`[bus] Bus ➜ [where] Where to?`), and `ItemPicker` gained `onSkip` (the Yes
  on a single-choice picker). The EventSheet's big card also shows
  "➜ destination" for travel.
- **Week travel line**: arrow + destination symbol, then the name, wrapping as a
  whole onto its own line in narrow columns (`break-words` alone split
  "Swimming pool" into "Swim/ming").
- **Words manager**: every shelf header has its own small **Add** (that shelf
  preselected) instead of one Add with a "current shelf"; empty shelves say
  "Nothing here yet". Rows have no category chip, as the shelf header already
  says it. On phones the kind tabs wrap onto a second row, and the editor's
  Remove shows just the bin (with an `aria-label`) so Remove, No and Yes stay
  on one line at 412px.
- **Birthdays**: taking a birthday away is **Clear** (not "No birthday", Q9).
  The list says "Today" / "Tomorrow" / "in N days" and "turns N". Year born
  accepts 1900 to this year and blocks Yes otherwise. The same date picker is
  used from the word editor (held until the editor's Yes).
- **`ensureSeeds()`** only adds missing `travel` seeds (the only seeds newer than
  v3, which already restores missing stay places).
- **Tests**: `gauntlet/b2/b2.mjs` (tests 1-5 at tablet, portrait and phone) and
  batch 1's `ui.mjs`, `data.mjs`, `settings.mjs` re-run unchanged as regression.

---

## 6. Batch 3 — Day view: inline add and hold-to-drag (items 7, 8)

### 6.1 What Frankie sees

- The bottom **Add bar is gone**. The day list gets more height.
- A small round **+** sits **between every pair of rows, above the first and
  below the last**. Geometry (constants at the top of `DayEvents.tsx`):
  - Each **+ slot is 2.25rem tall** (`SLOT_REM`). The list keeps its `gap-3`
    (0.75rem) on both sides of every slot, so rows sit **3.75rem apart** instead
    of 0.75rem today: **3rem more per row** (about 60px on the tablet).
  - The button is a **3.25rem circle** (about 46px on phones, 65px on the
    tablet), absolutely centred in its slot. It spills 0.5rem into the gaps
    above and below, but stays 0.25rem clear of the rows, so it never covers a
    row's own tap area.
  - A white background, `border-4 border-orange-dark`, orange `Plus` icon
    (34px), `aria-label="Add here"`.
  - Cost: at 1280×800 the list shows about half a row less than today. This is
    measured before and after (test 9), and reported to the owner.
- Tapping + opens the **composer**: a card *in that spot* with an orange
  `border-4`, `bg-orange-light` and `rounded-3xl`. The rows below move down, and
  the card is scrolled to the **top** of the day list
  (`scrollIntoView({ block: 'start', behavior: 'smooth' })`). She never leaves
  the day.
  - It appears with a new `.open-in` keyframe (opacity 0→1, `translateY(12px)`→0,
    180ms, **no `animation-fill-mode: forwards`**), like `.rise`. Nothing
    animates `height` or `max-height`, which would re-lay out the whole list on
    every frame on the A8. Nothing leaves a resting transform.
- **The card's header and footer never scroll away.** A meal step can be
  taller than the day list on every device: at 1280×800 the list is only about
  450-500px tall under the top bar, tab bar and Staying-at band, and about 25
  food tiles plus tabs fill three or more rows.
  - The header (breadcrumb) is `sticky top-0 z-10 bg-orange-light`, and the
    footer (No / Yes) is `sticky bottom-0 z-10 bg-orange-light`, both with an
    opaque background, a `border-orange` rule and the card's rounded corners.
  - They stick inside the day scroller (`DayPanel`'s `overflow-y-auto` div,
    which must stay the nearest scrolling ancestor, with no `overflow` set on
    anything in between). While she scrolls the tiles, the breadcrumb (her way
    back) stays at the top and **Yes / No stay at the bottom**.
- **Composer steps** (all inside the card):
  1. **"Add"** (➕): tiles for Activity, Travel, Breakfast, Lunch, Dinner,
     Shower, Brush teeth, Wake up, Bed. Types with nothing to choose (Shower,
     Teeth, Wake up, Bed) are added straight away.
  2. **Choose** for Activity or a meal: `ChoiceGrid` with shelves and New (Try
     comes in batch 5). Activity is single choice (tap = added). A meal is
     multi (tap tiles, then Yes).
  3. **Travel**: mode tiles → **"Where to?"** places (tap = added). Yes in the
     footer adds the mode with no destination (as in §5.6).
  - The **breadcrumb** header shows what has been chosen: `[Travel symbol]
    Travel › [Bus symbol] Bus ›`. Tapping a crumb goes back to that step.
  - The footer always has **No** (closes the composer, adds nothing). Multi
    steps and Where to? also have **Yes**.
  - **New** (make a new word, batch 2's `NewItemFields`) opens *inside the
    card* too. Thanks to `interactive-widget=resizes-content` (§3.1) the soft
    keyboard shrinks the page instead of covering it. Only the Staying-at
    picker and row edits still use full screens.
- When added: the composer closes, the new row appears at that spot with the
  existing `tick-pop` animation, and the toast says "Walk added".
- Tapping a row still opens its **EventSheet**, unchanged in this batch
  (decision, see Q11).

### 6.2 Store

`addEvent(input & { index?: number })`: after `materializeDay`, build the list
from `eventsFor(date)`, splice the new event in at `index` (clamped), and
`writeOrder(list)`. Put the event first so `writeOrder` renumbers it with the
rest. Without `index` it behaves as now (append).

### 6.3 Components

- **Delete** `src/components/day/AddEventFlow.tsx` and the Add bar in `DayView.tsx`.
- New `src/components/day/InlineAdd.tsx` (the composer). Props:
  `{ date, index, onClose }`. State: `step: 'type' | 'pick' | 'travel' | 'where' | 'new'`
  (batch 5 adds `'try'`), plus the type, travel id and selection. It uses
  `ChoiceGrid` directly, not `ItemPicker`'s Sheet.
- `DayView.tsx` holds `compose: { index: number } | null`. It passes
  `onCompose(index)` and `onCloseCompose` to the centre `DayPanel` only.
  - **The + slots render in all three panels with identical geometry**, so the
    day sliding in already has its final layout. The carousel remounts the
    track when a slide lands; if the slots appeared only then, every row would
    drop by 3rem at the end of each swipe, a visible jolt and a full relayout
    on the A8.
  - In the neighbour panels the slot buttons are non-interactive: `DayPanel`
    gets `interactive={offset === 0}`, and the neighbour's slot wrappers get
    `inert` and `aria-hidden`. The composer itself only ever renders in the
    centre panel.
  - Changing day (arrow/swipe/tab) closes the composer.
  - `SlideCarousel locked={Boolean(compose)}` stops day swipes while composing.
    The composer also carries `data-noswipe`.
- `DayEvents.tsx` layout: each slot wrapper holds **its row plus the + slot
  below it**, and there is one extra + slot before the first row. The composer
  renders in place of the + slot at its index. Drag measurements use slot
  wrapper heights, so `gap = wrapper height + ROW_GAP`, and the math stays
  right with the + slots in between.

### 6.4 Hold to drag (item 8)

**Why the obvious approach fails on Android.** Chrome decides at `touchstart`
whether a touch sequence may be blocked by script. It hit-tests the areas that
have **non-passive** touch listeners, and keeps that answer for the whole
sequence. A row today only has passive React and pointer listeners, and its
`touch-action` is `pan-y` (carousel track) or `manipulation` (buttons). So a
non-passive `touchmove` listener added *on* `pointerdown` comes too late: the
touchmoves arrive with `cancelable = false` and `preventDefault()` is ignored.
The first move after the hold would start a native scroll of the day list,
Chrome would send `pointercancel`, and the drag would die. `touch-action` also
can't be changed in the middle of a gesture. (The grip works only because it
has `touch-action: none` from the start.)

**Design**, in `DayEvents.tsx`, constants at the top: `HOLD_MS = 450`,
`HOLD_SLOP = 10` (px), `EDGE_PX = 64`, `EDGE_SPEED = 14` (px per frame):

- **Persistent non-passive touch listeners**: a `useEffect` on the list root
  `div` adds native `touchstart` and `touchmove` listeners with
  `{ passive: false }`, and removes them on unmount. Registering them from the
  start marks the list as a blocking region, so its touchmoves stay cancelable.
  - The handler is trivial: `if (liftRef.current) e.preventDefault()`. It never
    cancels `touchstart`, so taps, clicks and normal scrolls are untouched.
  - **Cost, accepted**: a scroll that starts on a row now waits for the main
    thread to run that one-line handler before scrolling. That is why it must
    stay trivial, with no state reads or allocations. Scrolls that start
    outside the list (the Staying-at band, the gaps) are not affected.
- `onPointerDown` on each row wrapper starts the **hold timer** and records the
  start point.
- **Pressing feedback** after 120ms: the row's **border turns orange** (a
  colour change only). There is **no scale or transform**: most taps last
  longer than 120ms, so a transform would make every tap animate, on a GPU that
  already struggles.
- `pointermove` beyond `HOLD_SLOP` before the timer fires → cancel. It was a
  scroll or a swipe, and the browser keeps doing that (`liftRef` is still
  false, so nothing is prevented).
- `pointerup` before the timer fires → it was a tap, and the click opens the row
  as now.
- **Timer fires**: set `liftRef.current = true`, `buzz(30)`
  (`lib/haptics.ts`), `setPointerCapture`, and `lockGestures()`. Then run the
  same drag code the grip uses (lift, rows slide aside, `moveEvent` on release,
  the existing clash rule: clashing times are cleared).
- **`pointercancel` during a live drag** is handled explicitly. The row drops
  back to where it started (no `moveEvent`), all state is cleared, and
  `liftRef`, the gesture lock, the timers and auto-scroll are reset. This is
  the same path as `pointerup`, but with `to = from`.
- **Edge auto-scroll**: while lifted, if the finger is within `EDGE_PX` of the
  day scroller's top or bottom edge, a `requestAnimationFrame` loop scrolls it
  by up to `EDGE_SPEED` px per frame (faster closer to the edge). Midpoints are
  measured once in **content coordinates** (`rect.top + scroller.scrollTop`).
  Then `target(y)` uses `y + scroller.scrollTop`, and the lifted row's `dy`
  adds `scrollTop - startScrollTop`. No re-measuring per frame, and a row can
  be taken to the end of a long day.
- **Carousel**: new `src/components/ui/gestureLock.ts` (`lockGestures()` /
  `unlockGestures()` / `gesturesLocked()`). `SlideCarousel.onTouchMove`
  returns early and resets its drag when it is locked.
- **Swallow the click after a drag**: set `suppressClick` on lift and clear it
  in an `onClickCapture` that calls `preventDefault()` + `stopPropagation()`.
- **Stop Android's long-press menus**: `onContextMenu={e => e.preventDefault()}`
  on the row, and CSS `-webkit-touch-callout: none` plus `user-select: none` on
  rows (the images inside are `draggable={false}` already).
- The **grip stays** as an instant drag handle (no hold) for family, since it is
  harmless. It shares the pointercancel and auto-scroll code. See Q12.
- Drag is disabled while the composer is open. + slots fade to `opacity-0`
  during a drag (opacity only) and keep their space.
- **Verification**: CDP touch events in headless Chromium exercise the code
  path, but they don't fully copy how Chrome on Android decides what is
  scrollable. **The real check is on Frankie's Tab A8**, and it is listed as a
  must-try in the owner's notes (Q12).

### 6.5 Edge cases

- A template (virtual) day: `+` → `addEvent` materialises, so indices match.
- An empty day: a single larger **"+ Add"** button (orange, `min-h-24`) where
  the list would be, in all three panels (same geometry rule).
- A hold that starts on the clock button or the symbol button works the same.
  A short tap keeps their own action.
- The composer is open and a remote sync changes the day's list: the composer
  keeps its `index`, clamped on insert.
- Portrait tablet and phone: composer tiles use `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`.
- The composer is open on a short day, so the card is shorter than the list:
  the sticky header and footer simply sit in place.

### 6.6 Batch 3 tests

1. No "Add" button at the bottom of the day. The day has N rows and N+1
   `[aria-label="Add here"]` buttons in the visible panel.
2. Tap the + between rows 1 and 2 → the composer is visible at that spot →
   Activity → Walk → the row list shows Walk at index 1 and the composer is
   gone. Take screenshots at each step on tablet (landscape + portrait) and phone.
3. The + at the top → Lunch → Soup + Cake → Yes → the new row is first. No
   closes without adding.
4. Travel inline: + → Travel → Train → Where to? → Park → "Train ➜ Park" on
   one line.
5. New inline: + → Activity → New → type "Bowling", pick a symbol → Yes → added
   and selected, still on the day view (no full-screen `role=dialog`).
6. **Hold-to-drag, touch (CDP)**:
   - Before starting, in `page.evaluate`, add a `pointercancel` listener on
     `window` that counts events, and read the day scroller's `scrollTop`.
   - touchStart on row 3, wait 600ms, move up 250px in 10 steps, touchEnd →
     row 3 is now at index 1.
   - Assert that the scroller's `scrollTop` is **unchanged**, and that **no
     `pointercancel`** fired.
   - Take a mid-drag screenshot. The mouse path works the same.
   - **Auto-scroll**: on a day with 10 rows at 1280×800, hold the first row and
     move to within 30px of the scroller's bottom edge. Wait until `scrollTop`
     reaches its maximum, then release. The row lands last.
   - **Cancel**: dispatch a `pointercancel` mid-drag (for example
     `touchCancel` via CDP). The order is unchanged, and the next tap opens the
     row normally.
7. Tap (touchStart + touchEnd within 100ms) opens EventSheet. A quick vertical
   move of 200px in 150ms scrolls the list and does not drag. A quick horizontal
   swipe still changes the day. After a drag, no EventSheet opens.
8. The clash rule: drag a 5 pm dinner above a 7:30 am breakfast → both lose
   their times (as now).
9. **Slot geometry and visible rows** at 1280×800. On the previous build (batch 2)
   and on this one, count the rows whose bounding box is fully inside the day
   scroller. Report both numbers (expected: about 3.5 → about 3), and take
   screenshots of both. Also check that each `Add here` circle's box does not
   overlap either neighbouring row's box.
10. **No jolt after a swipe**: swipe to the next day with CDP. Mid-slide,
    record the incoming panel's first row `top` relative to its panel. After it
    settles, the same row's `top` in the centre panel is equal (±1px).
11. **Yes/No stay on screen**: at 1280×800, 800×1280 and 412×915, open + →
    Lunch.
    - The bounding boxes of the Yes and No buttons and the breadcrumb lie inside
      the viewport and inside the day scroller's visible rect, without any
      scrolling.
    - Scroll the day scroller by 300px (or to its end, if shorter). The same
      three boxes are still fully visible.
    - Tick two foods after scrolling, then tap Yes without scrolling back.
      Take screenshots at each size.

### 6.7 Batch 3 as built (deviations from the design above)

- **Space, measured** (test 9, a 10-row day at 1280×800): batch 2 opened on 2
  whole rows (+7% of a third) in a 460px list with rows 158px apart (2.9 rows a
  screen once scrolled). Batch 3 opens on 2 whole rows in a 575px list (the Add
  bar's height is back) with rows 218px apart (2.6 rows a screen). The expected
  "3.5 → 3" was wrong for both builds: Staying at takes the first 115px.
- **Sticky header and footer use `-top-3` / `-bottom-3`**, not `top-0` /
  `bottom-0`: sticky insets count from inside the scroller's `py-3` padding, so
  at 0 the tiles showed through a 15px strip above and below. The card has
  `overflow: clip` (rounds off the header/footer corners; unlike `hidden` it
  makes no scroll box, so they still stick), and the header/footer are square.
- **The carousel is `overflow: clip`** (outer box and the three panels), not
  `overflow-hidden`. Focusing the New word's text box inside the card made the
  browser scroll the hidden box sideways, leaving the day half off screen; a
  clipped box can't be scrolled. The test selector `main div.shrink-0.h-full`
  still matches.
- **The day scroller** is `relative` and carries `data-day-scroller`. The card
  finds it with `closest()`, and measures its place with `offsetTop` (the
  arrival animation's transform would skew a bounding box). Opening scrolls the
  card to 8px below the top, smoothly; every step change jumps it back there
  (a long food list → back to Add; New's autofocus letting the browser scroll).
- **A new row arrives with `.open-in`**, not `tick-pop`: tick-pop overshoots to
  125%, which would push a full-width row past both screen edges.
- **Breadcrumb**: earlier steps are small bordered buttons (`aria-label="Back to
  Activity"`), the current one is a plain heading. "Add" and "New" show a drawn
  + (a white circle like the + she tapped; orange like the New tile), because
  ➕ resolves to Mulberry's text-drawn "add", a thin purple cross.
- **No** closes the card, except on **New**, where it goes back to the list it
  came from (as the full-screen form did). A meal's ticks survive New and are
  cleared by going back to Add.
- While the card is open the other + buttons fade out and are `inert` (their
  space is kept), so there is one card and nothing moves.
- **Drag measurements**: the row gap is read from the list's computed
  `row-gap` (the old hard-coded 12px was right on no screen size: gap-3 is 10.5,
  13.5 or 15px); midpoints are the rows' own boxes, not their wrappers (which
  include the + below). Edge auto-scroll is clamped to the scroll range
  measured at lift, so the lifted row's transform can't stretch the day.
- **Pressing** a row that is the current one (already orange) turns its border
  dark orange.
- **Clash test**: dragging the 5:30 pm Dinner above the 7:30 am Breakfast also
  clears Lunch's 11:30, which sits between them (the store's rule, unchanged).
- **Tests**: `gauntlet/b3/b3.mjs` (tests 1-11 at tablet, portrait and phone,
  plus the mouse path, auto-scroll and cancel), `extra.mjs` (empty day, the
  pressing state), `views.mjs` (month swipe, week, day arrows, the card closing
  on a new day, no swipe while adding) and batch 1/2's scripts under
  `b3/regress/` with the add steps pointed at the card. Intended changes there:
  "No on Lunch → back to Add" (No now closes the card) and "no header Back"
  (the breadcrumb's "Back to Add" matches). Batch 2's test 4 was already stale
  against its own fix commit (the birthday picker changed); `b2-fix2.mjs`
  covers that picker and passes.

### 6.8 Batch 3 review fixes

- **Landscape tablet: a whole row of tiles on every step.** Measured at
  1280×800, the old sticky breadcrumb (94px) and No / Yes footer (144px) left
  336px, and Lunch opened with no food in sight. Now, on a wide, short screen
  (`FLAT_SCREEN = (min-width: 900px) and (max-height: 850px)`), No / Yes sit at
  the end of the breadcrumb bar at button height (`compact` on `YesButton` /
  `NoButton`: `size="sm"`, 70px) and there is no footer. In the card,
  `ChoiceGrid findButton` puts Find behind a small button leading the shelf
  tabs' row (it opens the box, focused, with an X to close); a list with no
  tabs keeps the box, which is lower than a row of tabs. A meal's own shelf
  comes first with no heading (the breadcrumb, or the sheet's title, already
  says "Lunch"). First row of tiles in the 114-689px day: Add 246-471,
  Activity / Lunch / Dinner 383-646, Travel 246-471, Bus → Where to? 395-658
  (its breadcrumb wraps to two lines). Portrait and phone keep the footer.
- **Typing with the keyboard up.** A ResizeObserver on the day scroller and
  the bars measures the room between the bars; under `MIN_ROOM_REM = 14` they
  stop sticking (`relative`) and scroll away with the card. The focused text
  box (with its label's `section`, if that fits too) is scrolled into the
  space between the bars on focus and after every resize. Simulated keyboards
  (viewport made shorter): tablet 1280×470 unsticks, New word and Find stay in
  view; portrait 800×880 and phone 412×585 keep sticky bars, and the box is
  scrolled clear of them. Still to check on the Tab A8 itself.
- **A slow tap opens.** A hold that lifts a row and is let go without moving
  (under `HOLD_SLOP`) clicks the button it began on (the row, its symbol or
  its clock), then keeps every click off the page for `GHOST_MS` (500ms): the
  browser's own late click would otherwise land on the sheet that just opened
  under the finger. Edge auto-scroll waits until the row has moved, so a slow
  tap near the day's edge doesn't scroll it. The grip's still release does
  nothing, as before.
- **A move that clears times can be undone.** The toast says "Times cleared"
  with Undo, which puts back every row's place and time as they were (other
  fields keep later changes).
- **Adding mid-list writes one row.** The new row takes an order between its
  neighbours (a fraction if need be), so no other row is rewritten (and a
  concurrent edit to one on another device survives). Only with no room between
  them is the day renumbered, in the same single write.
- **Smaller fixes.** The card's writes are in `try / finally` (a failed write
  leaves it usable). Opening the card clears a plain toast ("Swimming added"
  sat on the breadcrumb and took its taps), but not one with Undo. The day
  arrows are disabled while the card is open, like the swipe. The toast's
  Undo word is sized on a span (it was the phone's small base size).
- **Tests**: `gauntlet/b3/fix2/` (`steps.mjs`, `find.mjs`, `keyboard.mjs`,
  `drag.mjs`, `sheet.mjs`, `toast.mjs`, plus review 1's drag and empty-day
  scripts, which give the same results as the build before these fixes).

---

## 7. Batch 4 — Festive days (item 13) and birthday check (item 14)

### 7.1 Logic: new `src/lib/festive.ts`

```ts
export interface Festive { key: 'christmas' | 'easter' | 'halloween'; word: string; symbol: string }
export function easterSunday(year: number): ISODate   // anonymous Gregorian algorithm
export function festiveOn(date: ISODate): Festive | null
```

| Day | Date | Word | Symbol | Colours |
|---|---|---|---|---|
| Christmas | 25 Dec | Christmas | `mb:Christmas_tree` | `bg-green-light`, `border-green` |
| Easter | Easter Sunday (2026-04-05, 2027-03-28, 2028-04-16) | Easter | `mb:Easter_egg` | new token `--color-lilac-light: #f1e8fb`, `--color-lilac: #7a4cc2` |
| Halloween | 31 Oct | Halloween | `mb:pumpkin_lantern` | `bg-orange-light`, `border-ink` (orange edges already mean "today") |

Only the day itself for now (see Q13 for Christmas Eve, Boxing Day, Good Friday
and others). The table lives at the top of `festive.ts`, so adding days is one
line each.

### 7.2 Where it shows

- **Day** (`DayPanel.tsx`): a **band like the birthday band**, directly under
  Staying at: `min-h-20 rounded-3xl border-4`, symbol at `text-6xl`, word at
  `text-3xl font-extrabold`. It comes before the birthday bands.
- **Week** (`WeekView.tsx`): the symbol (`text-3xl`) in the sticky header next
  to the date number, plus a thin band under the header in the festive colour
  with the word (`text-lg font-bold`).
- **Month** (`MonthView.tsx`): the symbol at `text-2xl sm:text-3xl` at the
  cell's **top-right**, beside the day number, so it can't be mistaken for the
  bottom markers.
  - Background precedence: **today** (orange) wins, then **staying away**
    (the existing `bg-sky`), then the festive background. On a day she is away,
    the festive symbol alone marks it, so "where she sleeps" never gets lost.
- **Birthdays re-check**: day band, week band with faces and month cake + face
  all show on the same date as a festive day without overlapping (test on a fake
  25 December birthday).

### 7.3 Batch 4 tests

1. `easterSunday` for 2024-2030 equals 03-31, 04-20, 04-05, 03-28, 04-16, 04-01
   and 04-21. Bundle `src/lib/festive.ts` with `npx rolldown` into the
   scratchpad (§2.6) and assert from a node script. Also check `festiveOn` for
   25 Dec, 31 Oct, and a normal day. `festive.ts` imports only types and
   `dates.ts`.
2. With `page.clock` set to 25 Dec 2026: the Today view shows the Christmas
   band, the week header shows the tree, the month cell has the tree at top
   right. Take screenshots at tablet, portrait and phone sizes. Do the same for
   31 Oct 2026 and 28 Mar 2027 (navigate there).
3. Give Mum a birthday of 25 Dec: the day shows both bands, the week shows both
   and the month shows the tree plus cake + face without overflow.
4. Stay away (Eastbourne) over 24-26 Dec: the 25 Dec month cell keeps the sky
   background and shows the tree.

### 7.4 Batch 4 as built (deviations from the design above)

- **`festive.ts`** holds the colours too: each `Festive` carries `bg` / `border`
  Tailwind classes, so the views never branch on the key. The table is one line
  per day with an `on(year)` function (a fixed date or `easterSunday`), so a new
  day (Boxing Day, Easter Monday = Easter + 1) is one line. Imports only
  `dates.ts` and types; `easterSunday` checked for 2019, 2024-2030, 2038 and
  2285 (the earliest possible, 22 March).
- **Lilac tokens** added to `index.css`: `--color-lilac: #7a4cc2`,
  `--color-lilac-light: #f1e8fb`.
- **Day**: as designed (under Staying at, before the birthday bands, the band's
  own edge colour).
- **Week**: the symbol sits beside the date number in the sticky header (with the
  word for screen readers); the column's first line is the word band, a bottom
  edge in the festive colour, before the birthdays band.
- **Month**: the cell also takes the festive edge (green / lilac; Halloween
  keeps ink) as well as the background, in the same precedence (today, then
  away, then festive; away keeps the ink edge). On phones there is no room for a
  24px number and a 26px symbol in a 52px square, so the symbol is a size down
  (`text-xl`; `text-2xl` from sm, see the review fixes below) and reaches into the cell's padding. On the
  narrowest phones (360px) it drops under the number, still at the right, and
  the cell may grow taller than square (phones only: `min-h-auto`, overflow
  visible; tablets keep `min-h-0` and now clip with `overflow-hidden`) rather
  than clip the birthday cake. The birthday cake and faces are also a size down
  on phones (`text-xl`), so the cake and a face fit side by side in a 412px
  phone's cell (they were cut off by a few pixels before).
- **Seen, not changed** (older than this batch): `button { color: inherit }` in
  `index.css` beats Tailwind's `text-white` on buttons, so "today" in the month
  and week (and the active tab) is ink on orange, not white. Readable (about
  6:1), but not what the classes say.
- **Tests**: `gauntlet/b4/unit.mjs` (Easter dates, `festiveOn`), `b4.mjs`
  (tests 2-4 at tablet, portrait, phone and a 360×780 phone: Christmas band /
  header tree / month tree top-right; Mum's 25 December birthday with both bands
  in the right order, week both bands, month tree + cake + face with nothing
  outside the cell; Eastbourne 24-26 Dec on 25 Dec as today and on a 20 Dec
  clock (sky wins, tree stays); Halloween by clock; Easter 2027 reached by
  month arrows, tapping the 28th, and week arrows). Regressions in
  `b4/regress/`: batch 3's scripts (`views.mjs` changed to change day by the
  tabs, as the arrows are disabled while adding since batch 3's fixes), the
  fix2 scripts, batch 1/2 scripts (same results as the build before this
  batch), and `time.mjs` (time picker on a festive day).
- **Review fixes** (a birthday on a festive day she spends away was cut off on
  the landscape tablet):
  - Month, sm and up: the festive symbol is now the number's size
    (`text-2xl`, not `text-3xl`). The top row may give up a few pixels (down
    to `1.25rem`, the number's empty descent) so a 6-row month's 80px cell
    still fits the bottom row.
  - Month: when a birthday, a doctor visit or visitors share the bottom row,
    the away place shows as its picture only (the name stays for screen
    readers). Bottom-row order is now away, birthday, doctor, visitors, so the
    least important come last. On a landscape tablet the row is one line
    (`sm:landscape:flex-nowrap`) and anything that doesn't fit is cut at the
    right. With away and three or more birthdays it shows one face and the +N.
    Portrait and phones still wrap (phone cells grow), and a phone's second
    birthday face now wraps under the cake instead of being cut off.
  - Week: the column order is now the same as the day view: Staying at,
    festive, birthdays. The festive band has no edge of its own (the colour
    change is the edge), so there is no double line above the birthday band.
    The header's festive symbol no longer lifts that day's weekday label.
  - Week: on phones and portrait tablets the week now opens with today's
    column scrolled into view (it opened at Monday before).
  - Tests: `gauntlet/b4/fix2/cells.mjs` checks the month cell for festive +
    away + birthday on a 5-row (December 2026) and a 6-row (December 2029)
    month, both as today and not today, and a very full cell (away, a doctor
    visit, 3 visitors, 3 birthdays). It runs at 1280×800, 800×1280, 412×915 and
    360×780. Tree, house, cake and the whole birthday group are inside the cell
    everywhere. In the very full cell on the landscape tablet, the doctor and
    visitors are cut off at the right (known, by priority).

---

## 8. Batch 5 — Web pictures, usage stats, Try something new (items 2, 5, 16)

### 8.1 Web pictures (item 2)

**Provider layer**: new file `src/lib/imageSearch.ts`.

```ts
export interface WebImage { id: string; thumb: string; title: string; creator?: string; license?: string; pageUrl?: string; provider: string }
export interface ImageProvider { name: string; search(q: string, page: number, signal: AbortSignal): Promise<WebImage[]> }
export const PROVIDERS: ImageProvider[]            // [openverse] today
export async function fetchImageBlob(img: WebImage): Promise<Blob>   // CORS fetch of the thumbnail
```

- **Openverse** (the only provider, no key):
  `GET https://api.openverse.org/v1/images/?q=<q>&mature=false&page_size=20&page=<n>`.
  - It maps `results[]` to `{ id, thumb: r.thumbnail, title, creator, license,
    pageUrl: r.foreign_landing_url }`.
  - The `thumbnail` links go through `api.openverse.org/v1/images/<id>/thumb/`.
    The picture is fetched as a Blob, shrunk and stored like any photo.
  - **Untested from here**: this machine can't reach Openverse, so CORS on the
    search and `/thumb/` endpoints is assumed, not verified. Every failure
    (network, CORS, HTTP error, bad JSON) is caught, and the web box then hides
    itself quietly. Report this to the owner as "needs a first try on a real
    device".
  - `mature=false` removes results **flagged** as mature by their source
    (mostly Flickr and other CC collections). It is weaker than Google
    SafeSearch, hence the Family-mode default below.
- **Google is not built.** Its Custom Search JSON API is closed to new
  customers and announced to close for existing ones (around January 2027).
  A key entered in Family settings would also be stored in the synced settings,
  where every family member's device can read it. The `ImageProvider`
  interface keeps a later keyed source (Pixabay, Google, …) to one new file and
  one line in `PROVIDERS` (Q1).
- **Wikimedia Commons** is **not** included: it has no safe-search filter. See Q2.
- Keep results in memory per query for the session, so re-opening doesn't hit
  the network. Openverse's anonymous limits are low, so debounce and cache.

**Who sees it**: family phones always get the web box. On the device marked as
**Frankie's tablet** it shows only while **Family mode** is on (Family → Words,
or New in the day's add card while a relative has Family mode on), so Frankie
making a new word on her own gets Camera, Photos and the symbol search as
today. Leaving Settings by any route (Back, Leave, a tab) ends Family mode, so
it can't be left on for her. One constant, `WEB_PICTURES_FAMILY_ONLY = true`,
at the top of `WebPictures.tsx` (Q1).

**UX**: new file `src/components/pickers/WebPictures.tsx`, placed inside
batch 2's `PictureChooser`, so the new-word form and the word editor both get it:

```
[ chosen picture 9rem ]  [ Camera ]  [ Photos ]  [ WEB BOX ]
```

- **The web box** is the same height as the Camera and Photos buttons and
  square: `border-4 border-ink rounded-2xl`. It holds a 2×2 mosaic of the first
  four results for the **word being typed** (debounced 700ms, from 2 letters)
  and a small `mb:globe` badge with the word "Web" along the bottom.
  - While loading: the globe, with an opacity pulse (no transform).
  - No results: the globe and "None".
  - Offline (`navigator.onLine === false`) or error: the box is hidden, and
    nothing is shown that could confuse her.
- **Tapping the box expands it**: a panel opens from the box (the `rise`
  animation, `fixed inset-2 z-50 rounded-3xl border-4 bg-paper`). It has a
  scrolling grid of results (`grid-cols-3 sm:grid-cols-4 lg:grid-cols-5`,
  square tiles with `object-cover`), a "More" button at the end (next page), and
  a No button to close. The title is the search word with the globe symbol.
- **Picking one**: the tile shows an orange ring, then `fetchImageBlob` → it
  becomes the form's photo Blob (the `photo` state changes from `File` to
  `Blob`). The panel closes, and the preview shows it. On Yes it is shrunk and
  stored by the existing `addItem` / `setItemPhoto` path. If the fetch fails,
  the toast says "Couldn't get that picture" and the panel stays open.
- **Credit**: `LibraryItem.photoCredit?: { title: string; creator?: string; license?: string; url?: string } | null`
  is saved with the photo and shown in small print in the WordEditor ("Picture:
  <title> by <creator>, <license>"). Openverse images are Creative Commons, so
  this keeps the family honest about attribution. It is cleared when the photo
  changes.

### 8.2 Usage stats (item 5)

**What is counted**: counts only, never content. Actions made while Family mode
is on are **not** counted, because that is the family, not Frankie. Anyone
using the tablet *outside* Family mode is counted as Frankie; the stats screen
says so in one line ("Counts everything done outside Family mode on each
device").

Keys use underscores, never dots, so they are safe as Firestore field names
(sync is off in every test here, so a field-path surprise could not be caught
offline):

| key | Label shown | Where tracked |
|---|---|---|
| `view_today` / `view_week` / `view_month` / `view_photos` | Today / Week / Month / Photos screens | `store.go()` (only when the view kind changes) |
| `view_day` | Opened a day | `store.go()` for `kind: 'day'` |
| `nav_swipe` / `nav_arrow` | Swiped / arrows (days + months) | `DayView` / `MonthView` settle handlers |
| `add_open` | Tapped + | `InlineAdd` mount |
| `add_activity` / `add_meal` / `add_travel` / `add_routine` | Added activity / meal / travel / routine item | `InlineAdd` finish |
| `add_cancel` | Tapped No while adding | `InlineAdd` |
| `event_open` / `event_time` / `event_rate` / `event_move` / `event_remove` | Opened / timed / rated / moved / removed a row | `DayView`, `EventSheet`, `DayEvents` |
| `photo_add` / `photo_view` / `tile_flip` | Took/added a photo, looked at a photo, flipped a tile | `PhotoStrip`, `store.toggleItemPhoto` |
| `word_new` / `word_web` | Made a new word / used a web picture | `NewItemFields` |
| `try_open` / `try_add` / `try_demo` | Opened Try / added an idea / watched the demo | `TryNewPanel` |
| `stay_change` | Changed "Staying at" | `DayView` |

Plus two numbers per day: **sessions** (app opened, or back after 5 minutes
away) and **active minutes** (distinct minutes with at least one tap, counted
from a passive `pointerdown` listener on `document`).

**Data**:

```ts
export interface UsageDay {
  /** `${deviceId}_${date}` */
  id: string
  deviceId: string
  deviceLabel: string
  /** This device was marked as Frankie's tablet when counted. */
  frankie: boolean
  date: ISODate
  counts: Record<string, number>
  sessions: number
  minutes: number
  updatedAt: string
}
```

- `src/lib/device.ts`: `deviceId()` (random UUID kept in localStorage
  `frankies-diary-device-id`, in try/catch, falling back to a per-session id)
  and `deviceLabel()` / `setDeviceLabel()`. The default label is "Frankie's
  tablet" if flagged, else "Phone" or "Computer" from a user-agent guess.
  `ThisDevice.tsx` gets a "Device name" text input.
- **Not in `DiaryState`, and not in the main database.** If usage lived in the
  store's state, every `track()` would call `store.set`, and `useStore`
  re-renders the whole app, including three day panels on Frankie's tablet.
  Instead:
  - `src/lib/usage.ts` is a **small module store** with its own
    `subscribe` / `useUsage()` hook (`useSyncExternalStore`). Only the stats
    screen subscribes.
  - Local persistence is a **separate IndexedDB database**
    `frankies-diary-usage` (version 1, one store `days`, keyPath `id`), opened
    lazily by `usage.ts`. The main `frankies-diary` database keeps
    `DB_VERSION = 2`. No upgrade means no tab can block it, and old app copies
    are unaffected.
- `track(key)` returns early in Family mode. It updates **today's doc for this
  device** in memory, marks it dirty, and **persists at most every 60 s**, and
  at once on `visibilitychange → hidden` and `pagehide`. Persisting writes the
  local database, then calls `sync.pushUsage(doc)` when sync is ready. Each doc
  has **one writer** (its own device), so last-write-wins is exact.
- `src/lib/sync.ts`:
  - `pushUsage(u)`: `setDoc(doc(fs, 'usage', u.id), u)`. It is **not** added to
    `COLLECTIONS`, so there is no permanent listener, and other devices' usage
    never streams into Frankie's tablet.
  - When sync becomes ready, `usage.flushUnsent()` pushes this device's docs
    whose `updatedAt` is newer than their local `pushedAt`.
  - `fetchUsage(from: ISODate)`: a one-off
    `getDocs(query(collection(fs, 'usage'), where('date', '>=', from)))`, called
    only while "Frankie's use" is open (and again with its refresh button).
    It is merged with this device's local docs; the local copy wins for its own
    id.
  - The Firestore rules already allow any collection for members. The volume is
    about 1 write per minute of use per device, and roughly 365 small docs per
    device per year. A single-field range query needs no composite index.
- `exportJSON` includes this device's usage docs.
- Two tabs open on one device may overwrite each other's counts for that day.
  The loss is small and acceptable (noted in code).

**Family settings → "Frankie's use"**: new section with symbol
`mb:graph_column` in `src/components/settings/UsageStats.tsx`:

- Toggles:
  - **7 days / 30 days**
  - **Frankie's tablet / All devices**. If no device is flagged, the view is
    "All devices" with the hint "Mark Frankie's tablet in This device".
- The line about what counts as Frankie (above). With sync on and the fetch
  failing (offline), it shows "This device only" above the numbers.
- Summary tiles (big numbers): **days used**, **sessions**, **active minutes**
  and **most used** (label).
- **"By part"**: a horizontal bar per label, sorted by count, showing the count
  and a CSS bar (`bg-orange`, width as % of max). It is plain and readable, with
  no chart library.
- **"By day"**: a row of 7 or 30 thin columns (total taps) with day initials,
  and minutes under each.
- **"By device"** (All devices only): one line per device label with its total.
- **Edge cases**: timezone is local dates (`today()`). A device's clock that is
  wrong only affects its own docs. The empty state is "Nothing yet".

### 8.3 Try something new (item 16)

**Ideas list**: new file `src/lib/ideas.ts`. It is curated so everything is a
real food or activity, with a clear Mulberry picture and the right shelf (the
Mulberry index alone has no categories and many non-food words):

```ts
export interface Idea { kind: 'food' | 'activity'; category: string; name: string; symbol: string }
export const IDEAS: Idea[]
export function freshIdeas(kind, items: LibraryItem[], category?: string): Idea[]  // not already in her list
```

"Already in her list" means an item of that kind (**including removed ones**,
so things the family took out aren't suggested again) with the same symbol or
the same name (case- and space-insensitive). Symbols are **normalised before
comparing**: seeds and older words store emoji (🍎, 🍔, 🥗…) while ideas use
`mb:` names, so compare `preferMulberry(item.symbol)` (which maps through
`EMOJI_TO_MULBERRY`) with the idea's symbol. Otherwise a word she already has,
such as a user "Apple" 🍎, would be suggested again.

| Shelf | Ideas (name → `mb:` symbol) |
|---|---|
| Breakfast | Croissant `croissant`, Pancakes `pancakes`, Bacon `bacon`, Boiled egg `egg_boiled`, Scrambled eggs `eggs_scrambled`, Fry up `fried_breakfast`, Roll `bread_roll`, Yogurt `yogurt`, Egg on toast `egg_on_toast`, Cheese on toast `cheese_on_toast_melted` |
| Lunch | Cheese sandwich `sandwich_cheese`, Ham sandwich `sandwich_ham`, Tomato soup `soup_tomato`, Salad `salad`, Macaroni cheese `macaroni_cheese`, Pot noodle `pot_noodle`, Sausage roll `sausage_roll`, Noodles `noodles`, Toastie `sandwich_toasted` |
| Dinner | Burger `hamburger`, Nuggets `chicken_nuggets`, Kebab `kebab`, Rice `rice`, Meatballs `meatballs_and_spaghetti`, Steak `steak`, Fish fingers `frozen_fish_fingers`, Pie `pie_meat`, Chicken `chicken` |
| Fruit | Apple `apple`, Banana `banana`, Grapes `grapes`, Orange `orange`, Strawberries `strawberry`, Melon `watermelon`, Pineapple `pineapple`, Pear `pear`, Peach `peach`, Mango `mango`, Carrots `carrot`, Broccoli `broccoli`, Peas `peas`, Sweetcorn `sweetcorn` |
| Treats | Crisps `crisps`, Jelly `jelly`, Apple pie `pie_apple`, Doughnut `doughnut`, Cupcake `cake_cup_cake`, Ice lolly `ice_lolly`, Cookie `biscuit_chocolate_chip`, Mince pie `mince_pie`, Sweets `sweet` |
| Drinks | Coffee `coffee`, Hot chocolate `hot_chocolate`, Milk `milk`, Milkshake `milkshake`, Lemonade `lemonade`, Squash `orange_squash`, Apple juice `apple_juice` |
| Home | TV `flatscreen_tv`, Cooking `cook-to`, Baking `bake-to`, Cleaning `broom`, Washing `laundry_basket`, Jigsaw `jigsaw_puzzle`, Reading `read_book-to`, Garden `back_garden`, Washing up `wash_up-to` |
| Out | Café `cafe`, Bank `bank`, Theme park `theme_park`, Beach `beach`, Picnic `picnic`, Church `church` |
| Active | Bike ride `bicycle`, Dancing `dance-to`, Horse riding `ride_horse-to`, Bowling `bowling`, Football `football`, Tennis `tennis`, Trampoline `trampoline`, Dog walk `walk_dog-to`, Exercise `exercise-to` |
| Fun | Music `music`, Singing `sing-to`, Games `computer_game`, Cards `playing_cards`, Painting `paint-to`, Colouring `colouring_book`, Crafts `craft_table`, Bubbles `bubbles` |
| Friends | Phone call `telephone_handset`, Video call `mobile_phone_video`, Visit `visit-to`, Party `party_popper` |
| Relax | Bath `bath`, Bubble bath `bubble_bath`, Nails `nail_polish`, Haircut `haircut`, Hand cream `hand_cream`, Rest `relax-to` |

(Every symbol above exists in `public/symbols/mulberry/`.)

**Entry point**: in `ChoiceGrid` for food and activity, a **"Try" tile** is
placed **first** in the grid, so she sees it before the defaults.

- It uses `Tile accent` with ✨ `2728` and the word "Try".
- The New tile stays at the end.
- The tile shows only when `freshIdeas` is non-empty for the current shelf (or
  "All").

**TryNewPanel** (`src/components/pickers/TryNew.tsx`: content plus a Sheet
wrapper). This batch passes `onTry` to `ChoiceGrid` in both `ItemPicker` and
the batch-3 composer, whose step list gains `'try'`, so Try opens inside the
day's add card too:

- **The demo, "how to search"**, at the top. It is a strip of three picture
  panels. A highlight ring and a pointing hand (`mb:touch_screen` at `text-6xl`)
  move from panel to panel every 1.2s. It plays **three rounds**
  (`animation-iteration-count: 3`) and then rests on panel 3, which is easier
  on her attention and on the A8's GPU:
  1. The **Find box** with 🔍 and the letters "c", "ca", "cak", "cake"
     appearing one by one.
  2. **Result tiles** popping in (the Cake, Cupcake and Doughnut symbols).
  3. The **thumbs up**, `mb:good`.

  It is purely visual (she is deaf) and uses CSS keyframes only. The ring and
  hand move with `transform` inside a small fixed-size strip, which is fine for
  a short run; nothing else in the panel animates. With
  `prefers-reduced-motion`, the three panels are static and numbered 1-2-3.
  - It auto-plays the first 3 times Try is opened on a device (localStorage
    counter in try/catch), then folds into a **"Show me"** button (`mb:look-to`)
    that replays it (three more rounds). It is tracked as `try_demo`.
- **The Find box**: big (`min-h-24 text-4xl`), with the 🔍 symbol inside at the
  left. Typing filters:
  - the ideas (by name) first
  - then **other Mulberry pictures** from `mulberryIndex()` whose label matches
    and that she doesn't have. They are labelled with a cleaned-up word:
    underscores become spaces, `-to` and `_1a`-style suffixes are dropped, and
    the first letter is capitalised. Only from **3 letters** (`MORE_MIN_LETTERS`;
    one or two letters match hundreds of words), and never letters, numbers,
    shapes or blocked words (anatomy, illness, harm, death: `suitable()` in
    `ideas.ts`), whole-word matches first.
- **The grid**: ideas for the current shelf (the shelf tabs are reused), shown
  as Tiles. It opens on a shelf, not All, so the landscape tablet shows a row
  of ideas.
- **Tapping an idea**: an inline confirm appears under it, with the big picture
  and the word, and "Add?" with **No / Yes**. Yes does
  `addItem(kind, name, symbol, null, { category, meals })`. In a picker or the
  composer, the new item is **selected** (single → added to the day; multi →
  ticked). The toast says "Croissant added". It is tracked as `try_add`.
- **Nudge** (small and kind): if the current shelf has fewer than 4 items, the
  Try tile gets a gentle ✨ pulse (one 2 s opacity/outline pulse on open, no
  scaling, not looping). That's all: no pop-ups.

### 8.4 Batch 5 tests

1. **Web pictures (mocked)**: use `page.route('https://api.openverse.org/v1/images/?*')`
   to return a fixture with 8 results whose `thumbnail` is
   `https://api.openverse.org/v1/images/<id>/thumb/`. Route those thumbnail URLs
   to coloured PNGs (with `access-control-allow-origin: *`). Then:
   - Family → Words → Food → Add → type "cake": the web box shows 4 thumbnails.
   - Leave Family mode, then + → Activity → New → type "cake": there is **no**
     web box, and Openverse is never requested (count the routed requests).
   - Tap → the expanded grid scrolls, and More loads page 2.
   - Pick one → the preview shows the picture → Yes. The item has a `photoId`,
     and its tile shows the camera badge.
   - Route to `abort()`: the box hides with no error text.
   - `context.setOffline(true)`: the box is hidden.
   - Take screenshots on tablet and phone.
2. **Stats**:
   - Mark the device as Frankie's tablet, then leave Family mode.
   - Open Week, Month, Today. Add an activity with +. Rate a row. Drag a row.
   - Enter Family → Frankie's use. The counts show Week 1, Month 1, Added
     activity 1, Rated 1, Moved 1, and 1 active day.
   - Repeat the same actions in Family mode: the counts don't change.
   - Reload: the counts persisted (the `frankies-diary-usage` database). The
     main `frankies-diary` database is still version 2.
   - Code check (review, not Playwright): `usage.ts` never calls into
     `store` state setters, and `DiaryState` has no usage field.
   - No count key contains a `.`.
   - Take a screenshot of the section at tablet and phone sizes.
3. **Try**:
   - Open Add → Breakfast → Try. The demo is visible and animating (screenshot
     at 0s, 1.3s and 2.6s).
   - The grid has no Toast, Cereal, Porridge or Eggs, and has Croissant.
   - Tap Croissant → Yes → back on the meal step with Croissant ticked. It is
     in the library with category `breakfast`.
   - Type "grape" in Find → Grapes shows.
   - Type "zebra" → Mulberry pictures that aren't foods show under "More
     pictures".
   - The 4th open shows "Show me" instead of auto-playing. After about 11 s
     the demo has stopped (`getAnimations()` on the strip is empty or finished).
   - A user food "Apple" with symbol 🍎 → Fruit ideas don't offer Apple.
   - Try is reachable inline: + → Breakfast → Try opens inside the card, with
     no full-screen dialog.

### 8.5 Batch 5 as built (deviations from the design above)

- **Web box size**: the chosen picture's size (9rem square), not the buttons'
  height: a 2×2 of 4.5rem thumbnails was too small to make out. Order on
  tablets is exactly `[picture] [Camera / Photos] [web box]`; on phones the
  picture and the web box share the first row and Camera / Photos go under
  them (three rows otherwise). While typing it pulses the globe ("looking"),
  then shows the first four results; "None" if there are none; hidden offline,
  on any error, and under 2 letters.
- **The opened panel is portalled to `<body>`** at `z-[45]`: above a
  full-screen sheet (z-40), below the toast (z-50, so "Couldn't get that
  picture" shows on it), and out of reach of the day card's clipping and
  arrival transform. Broken thumbnails are left out. "More" stops at
  Openverse's `page_count`.
- **`search()` returns `{ images, more }`** and `fetchImageBlob` tries the
  full-size picture if the thumbnail can't be fetched. Searches are cached per
  word and page for the session (a failed one is forgotten, so it is retried).
- **`PictureChooser.onPhoto(photo, credit)`**: camera and gallery pass `null`;
  the draft carries `photoCredit`; `store.setItemPhoto(id, photo, credit)`
  writes `photoCredit` (null for any other photo, so it clears on change).
- **Try's "Add?"** is not a confirm under the tile: tapping an idea shows one
  big "Add?" (picture and word), answered by the screen's own No / Yes (the
  card's bar or the sheet's footer), so one screen never has two Yes / No
  pairs. No goes back to the ideas; No again goes back to the list.
- **Try's first row**: on wide screens the demo strip, the Find box and Show me
  share one row, and Find is `min-h-20` (`min-h-16` on `lg`) rather than
  `min-h-24`: at 1280×800 the first row of ideas then sits at 491-686px in the
  114-690px day (it was cut off at the tile's picture before). Show me is always
  there (it also replays during the three auto-played opens).
- **Try tile** shows while finding too (Try then opens with what was typed), and
  pulses when the shelf in view has under 4 words. A Find in Try shows an idea
  when one of its Mulberry pictures matches (so "cup cake" finds Cupcake).
- **Usage persistence**: saved to the local database 2s after a count (so a
  reload loses nothing) and pushed to the cloud at most once a minute, and at
  once when the app is hidden. `pushedAt` stays local. "Start again" also
  clears this device's counts; Export includes them.
- **Screens counted**: the Today tab's day is "Today screen" even after swiping
  to another date (swipes are counted as swipes); a day opened from Week, Month
  or Photos is "Opened a day". Family → Leave goes back before Family mode ends,
  so the family handing back isn't counted. Most counts live in the store's
  mutations (rate, time, move, remove, stay, photo, flip), which Family mode
  pauses too.
- **Device name** in This device (blank = the guess: Frankie's tablet, Tablet,
  Phone, Computer).
- **Tests**: `gauntlet/b5/web.mjs` (mocked Openverse: 4 thumbnails, mature=false,
  panel, More to page 2, pick → photo + credit, editor credit, abort and offline
  hide the box, Frankie mode makes no request, Family mode in the day card,
  a failed picture keeps the panel, cache), `stats.mjs` (the counts after Week,
  Month, Today, +, rate and drag; nothing in Family mode; reload persists;
  database versions; no dotted keys; sessions; 30 days / All devices; rename),
  `try.mjs` (inline Try, no defaults offered, Croissant ticked and on
  Breakfast, grape / zebra, an activity idea adds the row, the 4th open waits
  for Show me and the demo finishes resting on panel 3, a user 🍎 apple and a
  removed Croissant aren't offered, Try from a row's Food sheet). All at
  1280×800, 800×1280 and 412×915. Regressions in `b5/regress/` (batches 1-4):
  same results as before this batch, except where the Try tile is now first in
  a food list (batch 2's "first tile Sandwich" and "only treats"; batch 3's
  "tick two foods in view" picks by position and now gets one on the phone).

---

## 9. All symbols chosen (verified to exist)

| Use | Symbol |
|---|---|
| Yes / No | `mb:good`, `mb:bad` |
| Travel type and kind | `mb:travel` |
| Bus, Train, Taxi, Car, Plane, Boat | `mb:bus`, `mb:train`, `mb:taxi`, `mb:car`, `mb:aeroplane`, `mb:ferry` |
| Where to? | `mb:where` |
| People shelves | `mb:family`, `mb:care_assistant_1a`, `mb:hug-to` |
| Food shelves | `mb:breakfast_1`, `mb:lunch_1`, `mb:dinner_hot`, `mb:fruit`, `mb:sweet`, `mb:drink` |
| Activity shelves | `mb:house`, `mb:go_outside-to`, `mb:exercise-to`, `mb:party_celebration`, `mb:meet-to`, `mb:relax-to` |
| "All" shelf | a 2×2 mosaic of the first four shelf symbols (no new symbol) |
| Clear (was None / No time) | `mb:remove-to` |
| Christmas, Easter, Halloween | `mb:Christmas_tree`, `mb:Easter_egg`, `mb:pumpkin_lantern` |
| Birthdays | 🎂 (→ `mb:birthday_cake`) |
| Words manager | `mb:pencil` |
| Stats | `mb:graph_column` |
| Web box | `mb:globe` |
| Try tile | ✨ OpenMoji `2728` (**copy file**) |
| Find in the demo | 🔍 OpenMoji `1F50D` (**copy file**) |
| Demo hand / Show me | `mb:touch_screen`, `mb:look-to` |

---

## 10. Build order, commits and release

One commit per item or tight group, message style as in `git log`
(e.g. "Month: centred title, arrows either side; no Year button"), each ending
with the two attribution lines. Batches go in order (b1 → b5):

- Batch 2 extracts `ChoiceGrid`, `NewItemFields` and `PictureChooser`, and adds
  travel.
- Batch 3 depends on batch 2's `ChoiceGrid`, `NewItemFields` and travel. It
  shows no Try tile.
- Batch 5 plugs Try into `ChoiceGrid` and the batch-3 composer, and the web
  box into batch 2's `PictureChooser`.

Update `README.md`'s "What is built" table at the end of each batch, when its
lines change.

**Release (an owner action; the builder never pushes or merges):**

1. **Batch 1 is published on its own first.** All its commits come first on
   the branch. The builder reports the hash of the **last batch-1 commit**, and
   the owner merges exactly up to it into `main` (deploy is on push to `main`).
2. **Wait until every device runs it.** Each device shows the version number on
   the day screen (`v1.x.NNN`). Open the app on Frankie's tablet and every
   family phone, and check that the number is at least batch 1's. Allow a few
   days for phones that are rarely opened.
3. **Then publish batches 2-5**, together or one at a time. Batch 2 is the first
   to write a new event type (`travel`) or library kind. Older copies would
   crash on it, which is what batch 1's guards and ErrorBoundary prevent.
4. **Why it matters**: if the whole branch is merged at once, the copy already
   on Frankie's tablet (without the guards) can meet a Bus event added from a
   phone that updated first. That means a white screen on Day and Week until
   the tablet happens to update.

---

## 11. Questions for the owner (decided by default, easy to change)

1. **Google image search**: Google's official API (Custom Search JSON API) is
   closed to new sign-ups, needs an API key, a search-engine id and billing that
   **you would have to create**, and Google has announced it will close for
   existing customers too (around January 2027). A key would also be visible to
   every family member's device through the synced settings. So we built your
   exact layout on **Openverse** (free, no key, filters pictures *flagged* as
   adult). Openverse's filter is weaker than Google SafeSearch, so the web box
   shows **only in Family mode**, not when Frankie makes a word on her own.
   - Should Frankie see it too?
   - Would you rather have a keyed source with proper safe search, such as
     Pixabay (free key)?
   - Openverse couldn't be reached from the build machine, so please try the
     web box on the tablet first; if it stays empty, tell us.
2. **Wikimedia Commons** could add more pictures but has no safe-search filter,
   so it is **off**. Keep it off?
3. **Food shelves** are by meal (Breakfast, Lunch, Dinner, Fruit, Treats,
   Drinks). Or would you rather have food types (Bread, Meat, Fish, Veg…)?
   **Activity shelves** are Home, Out, Active, Fun, Friends, Relax. Are these
   the right words for Frankie?
4. **"Staff"** replaces the old "Carer" role. Is "Staff" the word Frankie uses?
5. **Boat** uses the ferry picture, and **Plane** is the word (not
   "Aeroplane"). Right for her?
6. The **year picker is removed completely**, so jumping far ahead is by arrows
   or swiping only. OK?
7. The **week header** stays at the top in **every** orientation, not just
   landscape. OK?
8. **Pinch zoom** is off on **every** device, family phones too. Should phones
   keep it?
9. In pickers, the **Back button is replaced by No** at the bottom, and
   "None" / "No time" become **"Clear"** (a hand-taking-away picture), so no
   other button starts with "No". OK? On the travel "Where to?" step, **Yes**
   with no place chosen adds just the bus. Is that clear enough for her?
10. **New words and Try open inside the day's add card** (typing happens on the
    day screen). OK, or would a full screen be easier for typing?
11. **Tapping an existing row** still opens its detail screen (time, where, who,
    rating). Do you want that inline too, as a next step?
12. The **grip handle stays** (instant drag for family) alongside
    hold-to-drag. Remove it to declutter? Also, **please try hold-to-drag on
    Frankie's tablet** (press a row for half a second, then move): automated
    tests can't fully copy Android's touch handling.
13. **Festive days**: only Christmas Day, Easter Sunday and Halloween. Add
    Christmas Eve, Boxing Day, Good Friday, Easter Monday, Bonfire Night,
    Valentine's, Mother's/Father's Day, New Year? A festive look for all of
    December?
14. **Birthdays**: the optional year of birth shows her the age. Wanted? People
    added only for a birthday also appear in her "Who?" list. Should
    birthday-only people be hidden there?
15. **Stats**: counted on every device (labelled by device, shown for Frankie's
    tablet by default), never while Family mode is on, and kept forever. Any
    privacy limits or retention you want?
16. **Travel**: should the month view show a symbol for big trips (plane or
    boat)? Do you want a "from" place, or return journeys ("Bus home")?
17. **Try something new**: is the curated list fine, and should we nudge more,
    for example when she picks the same thing many days running?
18. The **thumbs** pictures are Mulberry's (light skin tone). Fine?
19. **Release order**: batch 1 has to go live, and every device (above all
    Frankie's tablet) has to show its version number, **before** the rest is
    published. Otherwise the tablet's current copy could show a white screen
    when a phone adds the first travel event. Can you check each device's
    version number after merging batch 1, or should we add a "devices and their
    versions" list to Family settings (the stats already know each device)?
20. **Meal pickers open on "All"** with that meal's foods first (like today),
    and the shelf tabs are a shortcut above them. Would opening straight on the
    meal's own shelf be better for her, now or once she's used to tabs?
21. **The + between rows** costs space, but less than feared because the Add
    bar has gone: at 1280×800 the day still opens showing two whole rows under
    Staying at (as before), and once scrolled it shows 2.6 rows a screen instead
    of 2.9. Is that acceptable, or should the + only appear after tapping an
    "Add" button?
22. **Stats** count anyone using the tablet outside Family mode as Frankie.
    OK, or should relatives always switch Family mode on?
