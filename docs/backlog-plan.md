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
| 1 | Disable pinch zoom | **Yes** | Viewport meta + CSS `touch-action` + a small JS guard. Chrome's accessibility setting "Force enable zoom" overrides it, and Android's own Magnification gesture still works, so Frankie can still magnify if someone switches that on for her. |
| 2 | Pictures from the web (Google safe search) | **Yes, but not from Google without a key** | Google's only official image search API (Custom Search JSON API) is closed to new customers and needs an API key, a search-engine id and billing. Scraping Google Images from a web app is blocked by CORS and by Google's terms. We build the exact UX the owner asked for on a **pluggable provider**: by default **Openverse** (free, no key, works from the browser, `mature=false` filters adult content, openly licensed pictures), plus a dormant **Google** adapter that switches on if the owner enters a key and search-engine id. |
| 3 | Categories for people, food, activities | **Yes** | New `category` field and migration v6. People: Family / Staff / Friends. Food and activities: see §4. |
| 4 | Thumbs up Yes / thumbs down No | **Yes** | Mulberry has `good` (thumbs up) and `bad` (thumbs down). |
| 5 | Usage stats in Family settings | **Yes** | Counted on each device (counts only, no content), synced as one small doc per device per day, and summarised in Family settings. |
| 6 | Travel (bus, train, taxi, car, plane, boat) + destination | **Yes** | New event type `travel` and library kind `travel`, with the destination held in the event's existing place field. Shown on one line: "Bus → Swimming pool". |
| 7 | "+" between items, adding without leaving the day | **Yes** | An inline "composer" card opens in the list at that spot. The bottom Add button and the separate add screens go away. |
| 8 | Hold an item to drag it | **Yes** | Press and hold for about 0.45 s, the row lifts, then drag. A short tap still opens the row. Moving before the hold completes still scrolls or swipes. |
| 9 | Week view: days/dates stay at the top | **Yes** | A sticky header row inside the week's scroll area. |
| 10 | Remove the Year button | **Yes** | The Year button and the year picker are removed. |
| 11 | Centred month title with arrows either side | **Yes** | |
| 12 | Months slide like days | **Yes** | Reuse the day carousel, including the Galaxy Tab A8 ghosting fix. |
| 13 | Christmas, Easter, Halloween shown in day/week/month | **Yes** | Easter is worked out for each year. |
| 14 | Birthdays managed in Family settings, visible everywhere | **Yes** | Birthdays already live on person items. The new work is a Birthdays section and a friendly day/month picker. Birthdays already show in day, week and month views; they get a little richer. |
| 15 | Simple way to edit/manage words | **Yes** | A "Words" section in Family settings with an edit screen per word (rename, picture, category, hide/remove, reorder). |
| 16 | Encourage new choices ("Try something new") | **Yes** | A curated list of Mulberry foods/activities she doesn't have yet, with a search and a looping picture demo showing how to search. |

Nothing on the list is blocked. Item 2 is the only one that can't use the named
supplier (Google) unless the owner gets a key.

---

## 2. Cross-cutting decisions (apply to every batch)

### 2.1 Migrations

`settings.templateVersion` is 5 today. Only **batch 2** changes stored data, and
it becomes **v6**. Restructure `Store.migrate()` into a linear chain so later
steps are simple to add (behaviour must stay identical for v1-v5):

```ts
const version = s.templateVersion ?? 1
if (version >= 6) return
if (version < 3) { /* existing v2+v3 block, unchanged */ }
if (version < 4) await this.migrateV4()
if (version < 5) await this.migrateV5()
await this.migrateV6()
```

(The v2/v3 block ends by writing `templateVersion: 3`, and each `migrateVn`
writes `templateVersion: n`, exactly as now.) Migrations run on every device and
their writes sync. Every step must be **idempotent**: it only fills in fields
that are missing and never overwrites family edits.

**Old app versions on other devices.** The PWA auto-updates (checked hourly),
but for a short time an old copy may meet new data. In **batch 1**, make the
readers tolerant **before** batch 2 adds new types:
`EVENT_TYPES[ev.type] ?? EVENT_TYPES.activity` everywhere an event type is looked
up (`eventFace`, `WeekView`, `EventSheet`, `AddEventFlow`). Today an unknown
`type` would crash an old client on `EVENT_TYPES[x].word`.

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
  where her right index finger goes). Any "clear" action (No time / No place)
  sits further left, apart from them.
- **Screens that are a question** (pickers and forms) swap their header Back
  button for the No button in the footer. That way one screen never has two
  ways to cancel. Add a `hideBack?: boolean` prop to `Sheet`.
- **Navigation screens** keep Back: EventSheet (changes save straight away),
  photo viewer, "Add to routine", Settings.
- Single-choice pickers (tap a tile = choose) have only No in the footer.
- "None" in the Where? picker becomes **"No place"**, so it can't be mixed up
  with No. Add an `allowNone` word prop: `noneWord`.

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

- `categoryOf` falls back like this. A person uses `role` (carer→staff,
  friend→friends, family→family, else friends). A food uses `meals[0]`
  (breakfast/lunch/dinner as is, treat→treats, drink→drinks, else dinner). An
  activity falls back to `home`. With this fallback the screens never depend on
  the migration having run, and items added by an old client still land
  somewhere sensible.
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

| Content component | Sheet wrapper used by |
|---|---|
| `ChoiceGrid` (tiles + category tabs + Try/New tiles) | `ItemPicker` |
| `NewItemFields` (word, category, picture) | `NewItemForm` |
| `TryNewPanel` | `TryNew` sheet |

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
- A seeded older diary for migration tests: before the app loads, open IndexedDB
  `frankies-diary` v2 in `page.addInitScript` and write the old records (store
  names and keys as in `db.ts`). Or load the previous commit's build once on the
  same origin and port.
- After each batch: `npx tsc -b`, `npx eslint src`, then look at every
  screenshot with the Read tool.

---

## 3. Batch 1 — Quick UI wins (items 1, 4, 10, 11, 12, 9)

### 3.1 No pinch zoom (item 1)

- `index.html` viewport:
  `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`.
- `src/index.css`: `html, body { touch-action: pan-x pan-y; }`. The allowed
  touch actions are intersected up to the root, so this removes pinch-zoom even
  inside buttons with `touch-action: manipulation`. The carousel (`pan-y`) and
  the drag grip (`none`) are unaffected.
- New file `src/lib/noZoom.ts`, called once from `main.tsx`. It adds three
  non-passive listeners on `document`:
  - `touchmove` with `e.touches.length > 1` → `preventDefault()`.
  - `gesturestart` → `preventDefault()` (Safari/iPad).
  - `wheel` with `e.ctrlKey` → `preventDefault()` (trackpad pinch on laptops).
  - Keyboard zoom (Ctrl +/−) stays: it is family-only and helps sighted relatives.
- Edge cases: two-finger touches that aren't a pinch are also blocked. Nothing
  in the app uses two fingers.

### 3.2 Yes / No everywhere Done/Cancel appear (item 4)

Build `YesNo.tsx` and add `Sheet.hideBack` (§2.2). Replace in:

| File | Change |
|---|---|
| `pickers/ItemPicker.tsx` | Footer: `[noneWord?] [No] [Yes (multi only)]`, `hideBack` |
| `pickers/NewItemForm.tsx` | Footer: `[No] [Yes disabled until valid]`, `hideBack` |
| `pickers/TimePicker.tsx` | Footer: `[No time?] [No] [Yes]`, `hideBack` |
| `day/AddEventFlow.tsx` | Type step: `[No]`, `hideBack` (the whole flow goes in batch 3) |
| `day/EventSheet.tsx` | `ItemPicker` for place gets `noneWord="No place"` |

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

### 3.5 Batch 1 tests

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
plus three kinds that aren't a meal. The meal picker **opens on its own shelf**
(Lunch opens "Lunch"), and every other shelf is one tap away.

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

### 5.1 Types (`src/types.ts`)

```ts
export type LibraryKind = 'person' | 'place' | 'food' | 'activity' | 'travel'

export interface LibraryItem {
  …
  /** Shelf within its kind (see lib/categories.ts). Missing on records from older versions: use categoryOf(). */
  category?: string
  /** Year of birth, optional; shows her age on the birthday band. */
  birthYear?: number | null
  /** @deprecated since v6 — use category. */ role?: PersonRole
  /** @deprecated since v6 for grouping; still written for meal pickers. */ meals?: MealSlot[]
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
  as in §4 (Tara → `staff`). `seedItems()` copies it.
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

### 5.3 Migration v6 (`store.migrateV6`)

1. For each seed with a `category`: if the stored item exists and has no
   `category`, set it from the seed.
2. For each non-seeded person, food or activity without `category`: set
   `categoryOf(item)` (the fallback in §2.3).
3. Add any missing travel seed (like the v3 migration adds stay places), with
   `db.putItem` + `set`.
4. `updateSettings({ templateVersion: 6 })`.

Idempotent: it never overwrites a category that is already set.

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
   choice, `allowNone noneWord="No place"`.
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
  and "Where to?" (placeId) → places with "No place". There is no separate
  "Where?" row.
- `WeekView` "others" list: mode symbol box + time. Word "Bus", then a second
  line "➜ Swimming pool" (`text-base font-bold`) with a small destination
  symbol. It is too narrow for one line.
- `MonthView`: unchanged (see Q16).

### 5.7 Categories in the pickers (item 3)

In `ChoiceGrid` (extracted from `ItemPicker`, §2.5):

- **Category tabs** above the grid, only when the list has **two or more
  non-empty** shelves. They sit in a horizontal row
  (`flex gap-3 overflow-x-auto`, `data-noswipe`). Each tab is a `BigButton`
  with its symbol at `text-4xl` and its word; the selected tab is `primary`
  (orange). The first tab is **"All"** (symbol `mb:lots_more`).
- The **initial tab** is the meal's shelf for a meal picker. Otherwise it is
  "All". In "All", the grid is split into sections with a header band per shelf
  (`text-2xl font-extrabold`, symbol `text-4xl`), so the whole list can still be
  scanned.
- Search ("Find", shown when there are more than 12 items) searches across all
  shelves and ignores the tab.
- The **New** tile passes the current tab's category (or the meal's) to
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

1. **Migration**: seed a v5 IndexedDB (no `category`, no travel items,
   `templateVersion: 5`, one user food with `meals: ['treat']`, one user person
   with `role: 'carer'`). Load the app, then assert: templateVersion 6, Toast is
   `breakfast`, Tara is `staff`, the user food is `treats`, the user person is
   `staff`, and six travel items exist. Reload and nothing changes (idempotent).
2. **Pickers**: Add → Lunch opens on the "Lunch" tab with Sandwich first. Tap
   "Treats" → Cake shows. Pick Sandwich + Cake → Yes → the row shows both.
   People picker: tabs Family / Staff show, Friends is hidden (empty). Take
   screenshots on tablet and phone.
3. **Travel**: Add → Travel → Bus → Where to? → Swimming pool. The row text
   includes "Bus" and "Swimming pool", and the title-line element's height is
   one line (≤ 1.6 × its font size) at 1280×800. Take screenshots on tablet and
   phone (with a long destination such as "Jon's house"). Also check the week
   column and EventSheet rows "Travel" and "Where to?".
4. **Birthdays**: Family (set a PIN) → Birthdays → Add → Mum → March → 3 → Yes.
   The list shows "Mum · 3 March". The day view on 3 March shows the band, week
   shows the face and month shows cake + face. Take screenshots.
5. **Words**: Food tab → Toast → rename "Toasty", move it to Lunch, Yes → the
   Lunch picker shows Toasty. Remove → Undo. Remove → Removed list → Restore.
   Up/down arrows swap Toast/Cereal and the picker order follows.

---

## 6. Batch 3 — Day view: inline add and hold-to-drag (items 7, 8)

### 6.1 What Frankie sees

- The bottom **Add bar is gone**. The day list gets more height.
- A small round **+** sits **between every pair of rows, above the first and
  below the last**:
  - a 3.25rem circle (about 46px on phones, 65px on the tablet), centred
  - a white background, `border-4 border-orange-dark`, orange `Plus` icon (34px)
  - `aria-label="Add here"`
  - in its own slot of about 3.5rem.

  It is small next to the rows, so the list stays readable, but still a big
  enough target.
- Tapping + opens the **composer**: a card that slides open *in that spot*. The
  rows below move down, and the card scrolls into view
  (`scrollIntoView({ block: 'nearest', behavior: 'smooth' })`). It has an orange
  `border-4`, `bg-orange-light` and rounded-3xl. She never leaves the day.
- **Composer steps** (all inside the card):
  1. **"Add"** (➕): tiles for Activity, Travel, Breakfast, Lunch, Dinner,
     Shower, Brush teeth, Wake up, Bed. Types with nothing to choose (Shower,
     Teeth, Wake up, Bed) are added straight away.
  2. **Choose** for Activity or a meal: `ChoiceGrid` with shelves, Try (batch
     5) and New. Activity is single choice (tap = added). A meal is multi (tap
     tiles, then Yes).
  3. **Travel**: mode tiles → **"Where to?"** places + "No place" button → added.
  - A **breadcrumb** header shows what has been chosen: `[Travel symbol] Travel ›
    [Bus symbol] Bus ›`. Tapping a crumb goes back to that step.
  - The footer of the card always has **No** (closes the composer, adds
    nothing). Multi steps also have **Yes**.
  - **New** (make a new word) and **Try** open *inside the card* too
    (`NewItemFields` / `TryNewPanel`), with the soft keyboard pushing the page
    up. Only the Staying-at picker and row edits still use full screens.
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
  `{ date, index, onClose }`. State: `step: 'type' | 'pick' | 'travel' | 'where' | 'new' | 'try'`,
  plus the type, travel id and selection. It uses `ChoiceGrid` directly, not
  `ItemPicker`'s Sheet.
- `DayView.tsx` holds `compose: { index: number } | null` and passes it (with
  `onCompose(index)` and `onCloseCompose`) to `DayPanel`, **for offset 0 only**.
  Neighbour panels render without + buttons, which is cheaper and avoids
  flashes during a slide.
  - Changing day (arrow/swipe/tab) closes the composer.
  - `SlideCarousel locked={Boolean(compose)}` stops day swipes while composing.
    The composer also carries `data-noswipe`.
- `DayEvents.tsx` layout: each slot wrapper holds **its row plus the + slot
  below it**, and there is one extra + slot before the first row. The composer
  renders in place of the + slot at its index. Drag measurements use slot
  wrapper heights, so `gap = wrapper height + ROW_GAP`, and the math stays
  right with the + slots in between.

### 6.4 Hold to drag (item 8)

In `DayEvents.tsx`, on each slot's row wrapper:

- `onPointerDown` starts a **hold timer** with constants at the top of the file:
  `HOLD_MS = 450` and `HOLD_SLOP = 10` px. Record the start point.
- While holding, the row shows a **pressing** state after 120ms: its border
  turns orange and the row grows by 0.02 over the rest of the hold (a CSS
  transition), so she can see something is happening.
- `pointermove` beyond `HOLD_SLOP` before the timer fires → cancel. It was a
  scroll or a swipe, and the browser keeps doing that.
- `pointerup` before the timer fires → it was a tap, and the click opens the row
  as now.
- **Timer fires** → `buzz(30)` (`lib/haptics.ts`), then `setPointerCapture`. Run
  the same drag code the grip uses (lift, rows slide aside, `moveEvent` on
  release, the existing clash rule: clashing times are cleared).
- **Stopping the page and the carousel from moving during a drag**:
  - A non-passive `touchmove` listener, added on `pointerdown` (not at lift) and
    removed on end, calls `preventDefault()` once `dragging` is true. The finger
    held still, so the browser has not started scrolling and the event can
    still be cancelled.
  - New `src/components/ui/gestureLock.ts` (`lockGestures()` / `unlockGestures()`
    / `gesturesLocked()`). `SlideCarousel.onTouchMove` returns early and resets
    its drag when it is locked.
- **Swallow the click after a drag**: set `suppressClick` on lift and clear it
  in an `onClickCapture` that calls `preventDefault()` + `stopPropagation()`.
- **Stop Android's long-press menus**: `onContextMenu={e => e.preventDefault()}`
  on the row, and CSS `-webkit-touch-callout: none` on rows (the images inside
  are `draggable={false}` already).
- The **grip stays** as an instant drag handle (no hold) for family, since it is
  harmless. See Q12.
- Drag is disabled while the composer is open. + slots fade to `opacity-0`
  during a drag and keep their space.

### 6.5 Edge cases

- A template (virtual) day: `+` → `addEvent` materialises, so indices match.
- + below the last row of an empty day: an empty list shows a single larger
  **"+ Add"** button (orange, `min-h-24`) where the list would be.
- A hold that starts on the clock button or the symbol button works the same.
  A short tap keeps their own action.
- The composer is open and a remote sync changes the day's list: the composer
  keeps its `index`, clamped on insert.
- Portrait tablet and phone: composer tiles use `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`.

### 6.6 Batch 3 tests

1. No "Add" button at the bottom of the day. The day has N rows and N+1
   `[aria-label="Add here"]` buttons.
2. Tap the + between rows 1 and 2 → the composer is visible at that spot →
   Activity → Walk → the row list shows Walk at index 1 and the composer is
   gone. Take screenshots at each step on tablet (landscape + portrait) and phone.
3. The + at the top → Lunch → Soup + Cake → Yes → the new row is first. No
   closes without adding.
4. Travel inline: + → Travel → Train → Where to? → Park → "Train ➜ Park" on
   one line.
5. New inline: + → Activity → New → type "Bowling", pick a symbol → Yes → added
   and selected, still on the day view (no full-screen `role=dialog`).
6. Hold-to-drag, touch (CDP): touchStart on row 3, wait 600ms, move up 250px in
   10 steps, touchEnd → row 3 is now at index 1. Take a mid-drag screenshot.
   The mouse path works the same.
7. Tap (touchStart + touchEnd within 100ms) opens EventSheet. A quick vertical
   move of 200px in 150ms scrolls the list and does not drag. A quick horizontal
   swipe still changes the day. After a drag, no EventSheet opens.
8. The clash rule: drag a 5 pm dinner above a 7:30 am breakfast → both lose
   their times (as now).

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
  bottom markers. Non-today cells take the festive background. Today stays orange.
- **Birthdays re-check**: day band, week band with faces and month cake + face
  all show on the same date as a festive day without overlapping (test on a fake
  25 December birthday).

### 7.3 Batch 4 tests

1. `easterSunday` for 2024-2030 equals 03-31, 04-20, 04-05, 03-28, 04-16, 04-01
   and 04-21 (run it as a tiny node script against the built module, or check
   in `page.evaluate` through the month view).
2. With `page.clock` set to 25 Dec 2026: the Today view shows the Christmas
   band, the week header shows the tree, the month cell has the tree at top
   right. Take screenshots at tablet, portrait and phone sizes. Do the same for
   31 Oct 2026 and 28 Mar 2027 (navigate there).
3. Give Mum a birthday of 25 Dec: the day shows both bands, the week shows both
   and the month shows the tree plus cake + face without overflow.

---

## 8. Batch 5 — Web pictures, usage stats, Try something new (items 2, 5, 16)

### 8.1 Web pictures (item 2)

**Provider layer**: new file `src/lib/imageSearch.ts`.

```ts
export interface WebImage { id: string; thumb: string; title: string; creator?: string; license?: string; pageUrl?: string; provider: string }
export interface ImageProvider { name: string; search(q: string, page: number, signal: AbortSignal): Promise<WebImage[]> }
export function activeProvider(settings: Settings): ImageProvider
export async function fetchImageBlob(img: WebImage): Promise<Blob>   // CORS fetch of the thumbnail
```

- **Openverse** (default, no key):
  `GET https://api.openverse.org/v1/images/?q=<q>&mature=false&page_size=20&page=<n>`.
  It maps `results[]` to `{ id, thumb: r.thumbnail, title, creator, license, pageUrl: r.foreign_landing_url }`.
  The `thumbnail` links go through `api.openverse.org`, which allows CORS, so
  the picture can be fetched as a Blob, shrunk and stored like any photo.
- **Google** (dormant):
  `GET https://www.googleapis.com/customsearch/v1?key=&cx=&q=&searchType=image&safe=active&num=10&start=`.
  It is only used when `settings.imageSearch.googleKey` and `googleCx` are set
  in Family settings ("Web pictures" row under Data). Pictures are fetched from
  `items[].image.thumbnailLink`.
- **Wikimedia Commons** is **not** included: it has no safe-search filter. See Q2.
- Keep results in memory per query for the session, so re-opening doesn't hit
  the network. Openverse's anonymous limits are low, so debounce and cache.
- Settings type: `imageSearch?: { provider: 'openverse' | 'google'; googleKey?: string; googleCx?: string }`.

**UX**: new file `src/components/pickers/WebPictures.tsx`, placed inside
`PictureChooser`, so the new-word form and the word editor both get it:

```
[ chosen picture 9rem ]  [ Camera ]  [ Photos ]  [ WEB BOX ]
```

- **The web box** is the same height as the Camera and Photos buttons and
  square: `border-4 border-ink rounded-2xl`. It holds a 2×2 mosaic of the first
  four results for the **word being typed** (debounced 700ms, from 2 letters)
  and a small `mb:globe` badge with the word "Web" along the bottom.
  - While loading: the globe and a gentle pulse.
  - No results: the globe and "None".
  - Offline (`navigator.onLine === false`) or error: the box is hidden, and
    nothing is shown that could confuse her.
- **Tapping the box expands it**: a panel grows from the box (the `rise`
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
is on are **not** counted, because that is the family, not Frankie.

| key | Label shown | Where tracked |
|---|---|---|
| `view.today` / `view.week` / `view.month` / `view.photos` | Today / Week / Month / Photos screens | `store.go()` (only when the view kind changes) |
| `view.day` | Opened a day | `store.go()` for `kind: 'day'` |
| `nav.swipe` / `nav.arrow` | Swiped / arrows (days + months) | `DayView` / `MonthView` settle handlers |
| `add.open` | Tapped + | `InlineAdd` mount |
| `add.activity` / `add.meal` / `add.travel` / `add.routine` | Added activity / meal / travel / routine item | `InlineAdd` finish |
| `add.cancel` | Tapped No while adding | `InlineAdd` |
| `event.open` / `event.time` / `event.rate` / `event.move` / `event.remove` | Opened / timed / rated / moved / removed a row | `DayView`, `EventSheet`, `DayEvents` |
| `photo.add` / `photo.view` / `tile.flip` | Took/added a photo, looked at a photo, flipped a tile | `PhotoStrip`, `store.toggleItemPhoto` |
| `word.new` / `word.web` | Made a new word / used a web picture | `NewItemFields` |
| `try.open` / `try.add` / `try.demo` | Opened Try / added an idea / watched the demo | `TryNewPanel` |
| `stay.change` | Changed "Staying at" | `DayView` |

Plus two numbers per day: **sessions** (app opened, or back after 5 minutes
away) and **active minutes** (distinct minutes with at least one tap, counted
from a `pointerdown` listener on `document`).

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
  `frankies-diary-device-id`) and `deviceLabel()` / `setDeviceLabel()`. The
  default label is "Frankie's tablet" if flagged, else "Phone" or "Computer"
  from a user-agent guess. `ThisDevice.tsx` gets a "Device name" text input.
- `src/lib/db.ts`: `DB_VERSION = 3` with a new object store `usage` (keyPath
  `id`). `Collection` and `Record_` gain `'usage'` / `UsageDay`, plus
  `putUsage(u, silent)`, and `loadAll` returns `usage`. Include it in `clearAll`.
- `src/lib/usage.ts`: `track(key)` returns early in family mode. It updates
  **today's doc for this device** in store state straight away (so the stats
  screen is always current), marks it dirty, and **persists at most every 60 s**,
  and at once on `visibilitychange → hidden` and `pagehide`. The persist goes
  `db.putUsage` → the write hook → Firestore.
- `src/lib/store.ts`: `state.usage: Record<Id, UsageDay>`, with `localRecord`
  and `applyRemote` cases for `'usage'`. `exportJSON` includes usage.
- `src/lib/sync.ts`: add `'usage'` to `COLLECTIONS`. Push uses `record.id`.
  Each doc has **one writer** (its own device), so last-write-wins on
  `updatedAt` is exact. The firestore rules already allow any collection for
  members. The volume is about 1 write per minute of use per device, and roughly
  365 small docs per device per year.
- Two tabs open on one device may overwrite each other's counts for that day.
  The loss is small and acceptable (noted in code).

**Family settings → "Frankie's use"**: new section with symbol
`mb:graph_column` in `src/components/settings/UsageStats.tsx`:

- Toggles:
  - **7 days / 30 days**
  - **Frankie's tablet / All devices**. If no device is flagged, the view is
    "All devices" with the hint "Mark Frankie's tablet in This device".
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
the same name (case- and space-insensitive).

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
wrapper; inline in the composer in batch 3):

- **The demo, "how to search"**, at the top. It is a strip of three picture
  panels. A highlight ring and a pointing hand (`mb:touch_screen` at `text-6xl`)
  move from panel to panel every 1.2s, looping:
  1. The **Find box** with 🔍 and the letters "c", "ca", "cak", "cake"
     appearing one by one.
  2. **Result tiles** popping in (the Cake, Cupcake and Doughnut symbols).
  3. The **thumbs up**, `mb:good`.

  It is purely visual (she is deaf) and uses CSS keyframes only. With
  `prefers-reduced-motion`, the three panels are static and numbered 1-2-3.
  - It auto-plays the first 3 times Try is opened on a device (localStorage
    counter in try/catch), then folds into a **"Show me"** button (`mb:look-to`)
    that replays it. It is tracked as `try.demo`.
- **The Find box**: big (`min-h-24 text-4xl`), with the 🔍 symbol inside at the
  left. Typing filters:
  - the ideas (by name) first
  - then **other Mulberry pictures** from `mulberryIndex()` whose label matches
    and that she doesn't have. They are labelled with a cleaned-up word:
    underscores become spaces, `-to` and `_1a`-style suffixes are dropped, and
    the first letter is capitalised.
- **The grid**: ideas for the current shelf (the shelf tabs are reused), shown
  as Tiles.
- **Tapping an idea**: an inline confirm appears under it, with the big picture
  and the word, and "Add?" with **No / Yes**. Yes does
  `addItem(kind, name, symbol, null, { category, meals })`. In a picker or the
  composer, the new item is **selected** (single → added to the day; multi →
  ticked). The toast says "Croissant added". It is tracked as `try.add`.
- **Nudge** (small and kind): if the current shelf has fewer than 4 items, the
  Try tile gets a gentle ✨ pulse animation (one 2 s pulse on open, not
  looping). That's all: no pop-ups.

### 8.4 Batch 5 tests

1. **Web pictures (mocked)**: use `page.route('https://api.openverse.org/v1/images/?*')`
   to return a fixture with 8 results whose `thumbnail` is
   `https://api.openverse.org/v1/images/<id>/thumb/`. Route those thumbnail URLs
   to coloured PNGs (with `access-control-allow-origin: *`). Then:
   - Family → Words → Food → Add → type "cake": the web box shows 4 thumbnails.
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
   - Reload: the counts persisted (IndexedDB).
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
   - The 4th open shows "Show me" instead of auto-playing.

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
| "All" shelf | `mb:lots_more` |
| Christmas, Easter, Halloween | `mb:Christmas_tree`, `mb:Easter_egg`, `mb:pumpkin_lantern` |
| Birthdays | 🎂 (→ `mb:birthday_cake`) |
| Words manager | `mb:pencil` |
| Stats | `mb:graph_column` |
| Web box | `mb:globe` |
| Try tile | ✨ OpenMoji `2728` (**copy file**) |
| Find in the demo | 🔍 OpenMoji `1F50D` (**copy file**) |
| Demo hand / Show me | `mb:touch_screen`, `mb:look-to` |

---

## 10. Build order and commits

One commit per item or tight group, message style as in `git log`
(e.g. "Month: centred title, arrows either side; no Year button"), each ending
with the two attribution lines. Batches go in order (b1 → b5). Batch 3 depends
on batch 2's `ChoiceGrid` and travel; batch 5's Try and web box plug into
components extracted in batches 2 and 3. Update `README.md`'s "What is built"
table at the end of each batch, when its lines change.

---

## 11. Questions for the owner (decided by default, easy to change)

1. **Google image search**: Google's official API is closed to new sign-ups and
   needs a key, a search-engine id and billing. We built it on Openverse (free,
   filtered for adult content). If you already have a Custom Search key and
   engine id, enter them in Family settings and Google is used instead. Would
   you prefer another keyed source such as Pixabay (free key, safe search)?
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
9. In pickers, the **Back button is replaced by No** at the bottom right, and
   "None" becomes "No place". OK?
10. **New words and Try open inside the day's add card** (typing happens on the
    day screen). OK, or would a full screen be easier for typing?
11. **Tapping an existing row** still opens its detail screen (time, where, who,
    rating). Do you want that inline too, as a next step?
12. The **grip handle stays** (instant drag for family) alongside
    hold-to-drag. Remove it to declutter?
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
