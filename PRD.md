# Frankie's Diary — Product Requirements Document

**Version:** 0.5 (draft) · **Owner:** Jon · **Date:** 21 September 2026 · **Status:** For discussion

---

## 1. Purpose

A shared visual diary and calendar app that lets Frankie see, plan and record her days using words, symbols, photos and simple ordered lists, and lets her family and carers see and update the same diary from their own devices.

The app exists to answer the questions Frankie cares about most, in a form she can read on her own:

- **What am I doing now, what's coming up, and what time do they start?**
- **What am I doing this week, this month, and months ahead?**
- **Where am I staying?**
- **What am I eating?**
- **Where is my family staying, and when are they coming back?**
- **What did I do, and did I like it?**

## 2. Who it's for

### Primary user — Frankie

- 42, has CHARGE syndrome. Deaf, non-speaking; signs in a mix of BSL and her own signs, and is very familiar with BSL. Also familiar with Makaton symbols.
- **Vision is very poor:** completely blind in one eye; the other needs very strong, thick glasses. Everything on screen must be large.
- **Reads single words** — people's names, objects, places — but not grammar or sentences. Text is useful to her; her current whiteboard is all text. Vocabulary is rudimentary, so most nouns benefit from a symbol as well.
- **Time:** understands on-the-hour and half-past. Prefers a 12-hour clock; also used to analogue faces. Has seen am/pm a lot and can probably use it with a supporting symbol. Struggles with other minute values.
- **Calendar structure is a strength:** knows days of the week, months and years, understands tomorrow / this week / next month, and plans months in advance. Weak only on abstract sequence words ("now", "next", "later").
- **Change:** unexpected changes cause real upset, but if a change is shown very clearly she understands and copes.
- Autistic; cognitive level roughly that of a 5–7-year-old. Strong with nouns, weak with verbs.
- **Confident computer user:** browses the web, searches Google for her interests, watches YouTube. Comfortable with standard website conventions.
- **Touch:** reliable tapping, can swipe and drag, no tremor or mis-taps. Uses her right index finger. More used to keyboard and mouse.
- Should type as little as possible, but must be able to add new items herself.
- Enjoys tracking family holidays — it calms her. It should be visible in the diary and calendar, but not dominate.
- Favourite colour is bright orange (the Sense charity orange).
- Lives in supported care in her house in Aylesford (reliable Wi-Fi); stays with her parents in Eastbourne every 2–3 weeks.

### What she uses today

A whiteboard in her flat, filled in by her staff: a simple table of the week's events, who is on duty, and her meal plan. All text, no symbols. She refers to it often. The app should feel like a bigger, richer version of that table — not a replacement for the whiteboard, which stays (the staff rota is not part of the app).

### Secondary users — family and carers

- **Jon** (brother): sets up the app, adds/edits entries, adds photos from WhatsApp/email, views Frankie's updates in near-real time on his phone.
- **Parents** (Eastbourne): view the diary on their devices; add entries, especially for Eastbourne visits and their own travel.
- **Tara** and other carers: already fill in the whiteboard, so are the natural day-to-day maintainers of the diary. They have no accounts of their own; they use Frankie's tablet, with a PIN-protected carer mode, when they are with her.

### Photos today

Frankie has a phone with WhatsApp but only uses it to make calls; she does not take or send photos. Photos of and for Frankie are taken and shared by family, so photo import into the diary is a family job (from Jon's and parents' phones), plus the in-app camera on her tablet when someone is with her.

## 3. Goals and non-goals

**Goals**

1. Frankie can open the app and understand her day, her week and the months ahead without help.
2. Frankie can add events, rate them, attach photos and add new words/pictures herself, with minimal typing.
3. Every family member sees the same diary, kept in sync centrally.
4. Every item shows a word **and** a symbol (with a photo one tap away).

**Non-goals**

- Replacing sign-language communication or acting as an AAC/speech device.
- Messaging of any kind (symbol messages, video clips).
- Reminders or notifications to Frankie.
- Medical, medication or care-plan record keeping.
- Staff rota / who is on duty — stays on the whiteboard.
- Weather, packing lists, memories/"on this day", wish lists.

## 4. Core features

### 4.1 Home screen: now and next

- Opens on today. Two large tiles, one above the other:
  - **Top tile:** the current activity — symbol/photo, word, and its start time.
  - **Bottom tile:** the very next activity — symbol/photo, word, and its start time.
- No sequence words label the tiles; position (top = happening, below = coming up) and the start times carry the meaning. A large clock (digital 12-hour with am/pm and a small analogue face) shows the current time.
- Persistent tab bar with word + icon: **Today**, **Week**, **Month**, **Photos**. Buttons are primary; swiping between days/weeks/months also works as a secondary gesture.

### 4.2 Week view (mirrors the whiteboard)

- A table of the 7 days, Monday to Sunday, matching the layout of her whiteboard as closely as possible (confirm orientation from a photo of it).
- Each day column shows, top to bottom: where she is staying, breakfast / lunch / dinner (with the food chosen), then the day's events in time order. Family trips and birthdays appear as a thin band across the top.
- Tap a day heading to open the Day view. Arrow buttons (or swipe) move between weeks.

### 4.3 Month view and looking ahead

- Month grid with large numbered days; today highlighted in orange; month name and year large at the top.
- Each day shows small indicators: where Frankie is staying, family travel (person's photo), birthdays, photos.
- Because she plans months in advance, moving ahead must be easy: arrow buttons for month-by-month, and a **year picker** — a 12-month grid for the current and next year — to jump straight to, say, "March".
- Tap a day to open the Day view.

### 4.4 Day view

- **Header:** date (big, e.g. "Tuesday 22 September 2026"), and **where Frankie is staying** as a photo + name — her Aylesford house, her parents' Eastbourne house, or, on holiday, the hotel/accommodation.
- Any family trip covering this day sits under the header as a single row: person's photo + name, place, accommodation photo + name, return date (e.g. **Mum · Dad · Spain · Hotel Sol · Saturday 27**). Present but not dominant.
- **Ordered event list**, top to bottom in time order. Each row: symbol (tap for photo), word, start time with am/pm and a sun/moon icon, place, who with, and a large tick box.
- **Ticking off.** A ticked event gets a big tick, a short animation and a vibration, then fades to the bottom (or hides behind a "Done" toggle) so the list reads as "what's left today".
- **Daily routine template**, identical in Aylesford and Eastbourne:
  - Wake up — 7:00 am
  - Breakfast — 7:30 am
  - Lunch — 11:30 am
  - Dinner — 5:30 pm
  - Frankie, Tara or family add everything else around these. Template times are editable in family/carer settings.
- **Meals** are events too: tapping Breakfast / Lunch / Dinner opens a **Food** picker so she can plan meals as she does on the whiteboard.
- Add events from a small set of **event types**, each with a Makaton-style symbol:
  - Shower · Brush teeth · Breakfast · Lunch · Dinner · Activity
- **Activities** open a picker of Frankie's keywords:
  - Food shopping · Clothes shopping · Walk · Swimming · Computer · Sleeping · Seeing friends
- **Detail pickers** — each answers one question with a scrollable grid of tiles:
  - **When** — time picker offering **whole hours and half hours only**, 12-hour, with am/pm shown as two large buttons carrying a sun (am) and moon (pm) icon; a small analogue face echoes the chosen time. Family/carer mode can enter other minutes.
  - **Where** — places (photos of the real places).
  - **Who** — people, photo + written name.
  - **Food** — for meals.
- **Rating** — after an event, choose a face: 😊 happy · 😠 angry · 😢 sad. Shown next to the event and summarised in the calendar over time.
- **Photos on the day** — photo strip at the bottom of the day. Take a photo in-app, or family add photos received via WhatsApp/email to a chosen day (share sheet: "Share to Frankie's Diary → pick day").

### 4.5 Tiles: word + symbol, tap for photo

- Every keyword tile shows the **word** in large type with a **Makaton-style symbol** beneath it.
- If the item also has a photo, a small photo badge appears on the symbol. **Tapping the symbol flips it to the photo**; tapping again flips back. Tapping the word (or anywhere else on the tile) selects the item. The flip state is remembered per tile so she can leave favourites showing as photos.
- This needs testing with her: if the symbol/select distinction causes mis-selections, fall back to a single "Symbols / Photos" toggle at the top of each list.
- Symbols must be checked at size with her glasses; where a Makaton symbol is too fine to read, the photo becomes the default face of the tile.

### 4.6 Adding new things herself

- Every list (day, people, places, foods, activities) ends with a large, obvious orange **"+ Add"** button with the plus sign and the word.
- **Adding to the day:** pick a type → pick from the list → pick a time → done. No typing.
- **Adding a new word to a list** (a new person, place, food or activity), three steps on one screen:
  1. **Word** — type it (large on-screen keyboard; suggestions from words she has used before). This is the only place she types.
  2. **Picture** — choose one or both of: a symbol from the Makaton grid (with simple word search), and a photo (camera or gallery).
  3. **Done** — the new tile appears in the list immediately, on all devices.
- A Bluetooth keyboard paired to the tablet is a supported option, and the same web app runs on her computer (see section 8).

### 4.7 Changes made obvious

- When someone moves, edits or cancels an event on Frankie's diary, the old event stays in place, **crossed out**, with the new version directly beneath it (or a "cancelled" symbol if removed). The change is also flagged on the week and month views with a small "changed" marker on that day, so she sees it before she opens the day.
- A large **green tick** button lets Frankie accept the change; the crossed-out version then disappears.
- Unaccepted changes are visible to family. Edits Frankie makes herself need no acceptance.

### 4.8 Family travel and accommodation

- Trips are entered by family from their own devices (Jon or parents) and record: who, destination, accommodation (name, location, photo), leave date, return date, transport symbol.
- They appear in three places, and nowhere else: as a band across the days in the **month view** and **week view** (person's photo + place name), and as the single row under the **Day view** header. No separate tab.
- Frankie's own holidays use the same trip record; her Day view then shows the accommodation photo as where she is staying.

### 4.9 Birthdays

- Recur every year in the calendar with the person's photo, name and a cake symbol, at the top of that day's list.

### 4.10 Gallery

- All photos, grouped by day and by event/person, newest first. Tap a photo to jump to its day.

### 4.11 Starting lists

Seed data for launch. All editable; each item needs a symbol and, where possible, a real photo.

**People**

- Family: Mum · Dad · Liz · Ria · Jon (each with photo and birthday)
- Carers: Tara, plus the other regular staff — names and photos to collect
- Friends: to collect

**Places**

- My house (Aylesford) · Mum and Dad's house (Eastbourne)
- Jon's house · Liz's house · Ria's house
- Supermarket · Clothes shop · Swimming pool · Park · Café
- Hairdresser · Nail salon · Doctor · Dentist
- Add real names and photos of her actual shops and pool

**Foods** (a small, familiar set; she is not a big eater)

- Breakfast: Toast · Cereal · Porridge · Eggs
- Lunch: Sandwich · Soup · Jacket potato · Beans on toast
- Dinner: Pasta · Pizza · Fish and chips · Roast dinner · Curry · Sausages and mash
- Treats: Cake · Ice cream · Biscuits · Chocolate
- Drinks: Tea · Juice · Water

**Activities**

- Food shopping · Clothes shopping · Walk · Swimming · Computer · Sleeping · Seeing friends
- Likely additions: Bath · Hairdresser · Nails · Massage · Bubbles · Car · Train · Visiting (Mum and Dad / Jon / Liz / Ria) · Birthday party · Holiday

**Event types**

- Wake up · Shower · Brush teeth · Breakfast · Lunch · Dinner · Bed · Activity

### 4.12 Sync and sharing

- One shared diary, stored centrally. Changes on any device appear on all others within seconds when online.
- Frankie's tablet works fully **offline** and syncs when connected (Wi-Fi at Aylesford is reliable; Eastbourne and holidays may not be).
- Family devices can optionally be notified when Frankie adds, rates or accepts something. Frankie's devices never receive notifications.

## 5. Later / open

- **Rating insights for family** — which activities, places, foods and people get the most happy faces over time.
- **Trip diary mode** — a multi-day holiday view with days numbered "Day 1, Day 2…" and photos per day.

## 6. Design and accessibility principles

- **Word and symbol, always both; photo one tap away.** Every tile is a noun in large type with a Makaton-style symbol beneath. No sentences, no verbs where a noun will do, no abstract labels.
- **Design for very low vision.** Assume she is reading through thick glasses with one eye:
  - Body text minimum 28–32 pt on a tablet; tile words larger.
  - No more than ~6 tiles per screen without scrolling; touch targets 100 px or more.
  - Dark text on a plain light background; orange for highlights only, never for body text. Never rely on colour alone.
  - Photos cropped tight to the subject with clear outlines; symbols tested at size.
- **Calendar structure is her strength — lean on it.** Full dates, day and month names spelled out, a year picker, and the same grid shapes she knows from paper calendars.
- **Time she can read.** 12-hour, whole and half hours, am/pm always paired with a sun or moon icon, digital with a small analogue face beside it.
- **Standard website conventions.** Tab bar, visible **Back** button, scrollable lists, obvious bordered buttons, a simple search box in long lists.
- **Buttons first, gestures second.** Every action has a visible button; swipe between days/weeks/months and drag-to-reorder are allowed as shortcuts, never the only way. No long-press or double-tap. Primary actions sit towards the right and bottom of the screen for her right index finger.
- **Symbol set: Makaton** as the default (check The Makaton Charity's licensing terms for apps).
- **Consistent layout.** Same positions every day; nothing rearranges itself.
- **No sound and no interruptions.** Vibration and animation only, in response to her own taps.
- **Undo, not confirm dialogs.**
- **Family/carer mode** behind a PIN for editing template times, deleting library items and settings.

## 7. Roles and permissions

| Role | Device | View | Add / edit events | Add new words & pictures | Accept changes | Add photos | Trips & birthdays | Settings & deletions |
|---|---|---|---|---|---|---|---|---|
| Frankie | her tablet / her computer | ✓ | ✓ | ✓ | ✓ | ✓ | – | – |
| Jon (admin) | phone / web | ✓ | ✓ | ✓ | – | ✓ | ✓ | ✓ |
| Parents | phone/tablet / web | ✓ | ✓ | ✓ | – | ✓ | ✓ | – |
| Tara / carers | carer mode on Frankie's tablet (PIN) | ✓ | ✓ | ✓ | – | ✓ | – | – |

## 8. Technical approach (outline)

- **Build once as a responsive web app (PWA)** and install it on Frankie's Android tablet as an app. The same app runs in Edge or Chrome on her Windows 11 PC with keyboard and mouse, installs on Jon's and the parents' Android phones, and matches the website conventions she already knows. Everyone is on Android or Windows, so no iOS work is needed. If native features are needed later (camera reliability, share-sheet), wrap the PWA in a thin Android shell (Capacitor or a Trusted Web Activity).
- **Sign-in:** Frankie's tablet and PC stay permanently signed in with no password prompts; family sign in with Google (they already have Android accounts). Carer mode is a PIN inside Frankie's session, not a separate account.
- **Backend / sync:** a hosted realtime database with offline support and authentication — Firebase (Firestore + Storage + Auth) or Supabase. Photos in cloud storage with thumbnails generated on upload.
- **Data model (sketch):**
  - `Person` — name, photo, role, birthday
  - `Place` — name, symbol, photo, type (home / shop / pool / friend's house / accommodation), location
  - `Food` — name, symbol, photo
  - `Keyword` — name, symbol, photo, category (event type, activity), `showPhotoByDefault`
  - `DayTemplate` — fixed daily items and times
  - `Day` — date, staying-at (Place), notes
  - `Event` — day, type, keyword, food, start time, place, people, done, rating, photos, `supersedes`, `accepted`
  - `Trip` — person(s), destination, accommodation (Place), leave date, return date, transport
  - `Photo` — storage ref, day, event, uploader
- **Photo import:** register the app as an Android share target so a WhatsApp/email photo goes straight into a chosen day.
- **Offline:** local cache on every device; last-write-wins with an edit history so accidental changes can be reverted.
- **Privacy:** photos and location data about a vulnerable adult — private to named accounts, encrypted in transit and at rest, exportable and deletable. Consider a best-interests decision record for storing her data on Frankie's behalf.

### Tablet to buy

No tablet exists yet. Criteria, in priority order:

1. **Screen size 11–13"** — the single biggest factor for her vision. Bigger beats faster.
2. **Bright, high-contrast display** (500+ nits helps under room lighting and glare through thick glasses).
3. **Android** with several years of updates ahead of it.
4. **Decent rear camera** for in-app photos; front camera not important.
5. **Keyboard-cover compatibility** or Bluetooth keyboard support, given her keyboard-and-mouse habit.
6. A **rugged case with a stand** so it lives propped up next to the whiteboard.

Large-screen Samsung Galaxy Tab models are the obvious candidates; check current models and prices at purchase time.

## 9. Success measures

- Frankie opens the app most days without being prompted.
- Frankie adds, ticks or rates at least one event a day on her own.
- Frankie adds a new word/picture herself within the first month.
- Family report fewer "when is it happening?" / "where is Mum?" questions.
- Diary is populated for at least 90% of days (carer/family adoption).

## 10. Phasing

**Phase 1 — MVP (Frankie + Jon):** home screen (now and next), week view, month view with year picker, day view with template, meals/food picker, event list and pickers, word + symbol tiles with photo flip, ticking off, ratings, where-she's-staying, "+ Add" flows, in-app photos, sync between tablet and Jon's phone.

**Phase 2 — Family:** parents' access, trips with accommodation photos, birthdays, photo import via share sheet, gallery, use on Frankie's computer.

**Phase 3 — Carer mode and change handling:** PIN-protected carer mode, crossed-out changes with green-tick acceptance, rating insights.

## 11. Open questions

1. Photos and birthdays for Mum, Dad, Liz, Ria and Jon; names and photos of Tara and the other regular carers; friends' names.
2. Real names and photos of her actual supermarket, clothes shop, pool and other regular places.
3. Her regular weekly pattern (e.g. swimming on a fixed day), so recurring events can be seeded.
4. Whether the care provider is happy for staff to use carer mode on her tablet.
5. Are there people, places or things that should never appear (e.g. animals)?
6. Makaton symbol licensing for use in an app — to confirm with The Makaton Charity.
7. Whether to take a photo of the whiteboard next time someone is at the flat, to check the week view against it.
