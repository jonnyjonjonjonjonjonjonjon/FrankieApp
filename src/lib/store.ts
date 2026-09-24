import { createContext, useContext, useEffect, useState } from 'react'
import type {
  DayRecord,
  DiaryEvent,
  EventType,
  HHMM,
  Id,
  ISODate,
  LibraryItem,
  LibraryKind,
  PhotoRecord,
  Rating,
  Settings,
  TemplateItem,
  View,
} from '../types'
import * as db from './db'
import { seedItems, HOME_PLACE_ID, PREVIOUS_SEED_SYMBOLS } from './seed'
import { shrinkImage, primeUrl, forgetUrl } from './images'
import { categoryOf, defaultCategory } from './categories'
import { minutesOf } from './time'

const timeKey = (e: DiaryEvent) => (e.time ? minutesOf(e.time) : 1e6)
import { fromISO, toISO, today } from './dates'

// ------------------------------------------------------------
// State
// ------------------------------------------------------------

export interface Toast {
  message: string
  undo?: () => void
}

interface DiaryState {
  loading: boolean
  items: Record<Id, LibraryItem>
  events: Record<Id, DiaryEvent>
  days: Record<ISODate, DayRecord>
  photos: Record<Id, PhotoRecord>
  settings: Settings
  view: View
  familyMode: boolean
  toast: Toast | null
}

const initialState: DiaryState = {
  loading: true,
  items: {},
  events: {},
  days: {},
  photos: {},
  settings: db.DEFAULT_SETTINGS,
  view: { kind: 'today' },
  familyMode: false,
  toast: null,
}

const byId = <T extends { id: string }>(list: T[]) =>
  Object.fromEntries(list.map(x => [x.id, x])) as Record<string, T>

const stamp = () => new Date().toISOString()

/** Shape of the stored diary; a fresh install starts here, older diaries migrate up to it. */
const CURRENT_TEMPLATE_VERSION = 5

/** Virtual template events get ids of this shape until the day is materialised. */
export const isVirtualId = (id: Id) => id.startsWith('tpl:')

// ------------------------------------------------------------
// Store
// ------------------------------------------------------------

class Store {
  state: DiaryState = initialState
  private listeners = new Set<() => void>()
  private toastTimer: ReturnType<typeof setTimeout> | null = null

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private set(patch: Partial<DiaryState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach(fn => fn())
  }

  // ---------- boot ----------

  /** Set once migrations may run: straight away with sync off, else after the first cloud snapshot. */
  private canMigrate = false
  private migrating: Promise<void> | null = null

  /**
   * Read the local copy. `migrate: false` (sync configured) holds migrations
   * back until `syncedOnce()`, so they never stamp stale local records as
   * newer than edits already in the cloud (backlog plan §2.1).
   */
  async load({ migrate = true }: { migrate?: boolean } = {}) {
    this.canMigrate = migrate
    const data = await db.loadAll()
    let items = data.items
    let settings = data.settings
    // Boot-time defaults are written silently with an old timestamp so any
    // version already in the cloud wins when sync connects.
    const fresh = items.length === 0
    if (fresh) {
      items = seedItems(new Date(0).toISOString())
      await db.putItems(items, true)
    } else {
      items = await this.ensureSeeds(items)
    }
    // A fresh install's seeds already have the current shape: no migration to run.
    const freshSettings = fresh && settings.templateVersion === undefined
    if (!settings.homePlaceId || freshSettings) {
      settings = {
        ...settings,
        homePlaceId: settings.homePlaceId ?? HOME_PLACE_ID,
        ...(freshSettings ? { templateVersion: CURRENT_TEMPLATE_VERSION } : {}),
        updatedAt: new Date(1).toISOString(),
      }
      await db.putSettings(settings, true)
    }
    this.set({
      loading: false,
      items: byId(items),
      events: byId(data.events),
      days: Object.fromEntries(data.days.map(d => [d.date, d])),
      photos: byId(data.photos),
      settings,
    })
    if (migrate) await this.migrate()
  }

  /**
   * Seeds added in later versions (the travel modes) for diaries that began
   * before them. Written like the boot seeds — silently, stamped at epoch — so
   * a version the family already edited or removed elsewhere always wins.
   * Only ids missing locally are added, so it is safe on every load.
   */
  private async ensureSeeds(items: LibraryItem[]): Promise<LibraryItem[]> {
    const have = new Set(items.map(i => i.id))
    const missing = seedItems(new Date(0).toISOString()).filter(s => s.kind === 'travel' && !have.has(s.id))
    if (!missing.length) return items
    await db.putItems(missing, true)
    return [...items, ...missing]
  }

  /** Sync has caught up with the cloud once (every collection's first server snapshot is applied). */
  async syncedOnce() {
    this.canMigrate = true
    await this.migrate()
  }

  /** Run any pending migrations; a second caller joins the one already running. */
  migrate(): Promise<void> {
    return (this.migrating ??= this.runMigrations().finally(() => {
      this.migrating = null
    }))
  }

  /**
   * One-off tidy-ups for diaries saved by earlier versions (synced, so every
   * device ends up the same). Each step only fills in what is missing, so it
   * is safe to run again:
   *  v2 (Sept 2026): "Wake up" left the default routine.
   *  v3 (Sept 2026): stay places — Rochester Road / Eastbourne / Jon's house /
   *     Hotel are marked as places Frankie can stay; seeded items get an order.
   *  v4, v5: see migrateV4 / migrateV5 below.
   */
  private async runMigrations() {
    const s = this.state.settings
    const version = s.templateVersion ?? 1
    if (version >= CURRENT_TEMPLATE_VERSION) return
    if (version < 3) {
      if (version < 2) {
        const todayIso = today()
        const stale = Object.values(this.state.events).filter(
          e => e.type === 'wake' && e.fromTemplate && !e.done && !e.deleted && e.date >= todayIso,
        )
        for (const e of stale) await this.updateEvent(e.date, e.id, { deleted: true })
      }
      const seeds = seedItems()
      for (const seed of seeds) {
        const cur = this.state.items[seed.id]
        if (!cur) {
          if (seed.kind === 'place' && seed.stayable) {
            await db.putItem(seed)
            this.set({ items: { ...this.state.items, [seed.id]: seed } })
          }
          continue
        }
        const patch: Partial<LibraryItem> = { order: seed.order }
        if (seed.stayable) patch.stayable = true
        // Rename only if the old seed name is still in place (not edited by the family).
        if (cur.name === 'My house' || cur.name === "Mum and Dad's house") patch.name = seed.name
        await this.updateItem(seed.id, patch)
      }
      await this.updateSettings({
        template: s.template.filter(t => t.type !== 'wake'),
        templateVersion: 3,
      })
    }
    if (version < 4) await this.migrateV4()
    if (version < 5) await this.migrateV5()
  }

  /** v5 (Sept 2026): Mulberry symbols. Seeded words that shared an emoji get their own symbol, unless the family changed it. */
  private async migrateV5() {
    const seeds = seedItems()
    for (const [id, old] of Object.entries(PREVIOUS_SEED_SYMBOLS)) {
      const cur = this.state.items[id]
      const seed = seeds.find(x => x.id === id)
      if (cur && seed && cur.symbol === old) await this.updateItem(id, { symbol: seed.symbol })
    }
    await this.updateSettings({ templateVersion: 5 })
  }

  /** v4 (Sept 2026): events are an ordered list with optional times; Doctor/Dentist are medical places. */
  private async migrateV4() {
    const byDate: Record<string, DiaryEvent[]> = {}
    for (const e of Object.values(this.state.events)) (byDate[e.date] ??= []).push(e)
    const changed: DiaryEvent[] = []
    for (const list of Object.values(byDate)) {
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || timeKey(a) - timeKey(b) || a.createdAt.localeCompare(b.createdAt))
      list.forEach((e, i) => {
        if (e.order !== i * 10) changed.push({ ...e, order: i * 10, updatedAt: stamp() })
      })
    }
    if (changed.length) {
      await db.putEvents(changed)
      this.set({ events: { ...this.state.events, ...byId(changed) } })
    }
    for (const id of ['seed-place-doctor', 'seed-place-dentist']) {
      if (this.state.items[id] && this.state.items[id].placeType !== 'medical') await this.updateItem(id, { placeType: 'medical' })
    }
    await this.updateSettings({ templateVersion: 4 })
  }

  // ---------- navigation ----------

  go(view: View) {
    this.set({ view })
    window.scrollTo(0, 0)
  }

  setFamilyMode(on: boolean) {
    this.set({ familyMode: on })
  }

  // ---------- toast / undo ----------

  toast(message: string, undo?: () => void) {
    if (this.toastTimer) clearTimeout(this.toastTimer)
    this.set({ toast: { message, undo } })
    this.toastTimer = setTimeout(() => this.set({ toast: null }), undo ? 7000 : 3500)
  }

  clearToast() {
    if (this.toastTimer) clearTimeout(this.toastTimer)
    this.set({ toast: null })
  }

  // ---------- library items ----------

  async addItem(
    kind: LibraryKind,
    name: string,
    symbol: string,
    photo: Blob | null,
    extra: Partial<LibraryItem> = {},
  ): Promise<LibraryItem> {
    const now = stamp()
    let photoId: Id | null = null
    if (photo) {
      photoId = db.newId()
      const small = await shrinkImage(photo)
      await db.putBlob(photoId, small)
      primeUrl(photoId, small)
    }
    const item: LibraryItem = {
      id: db.newId(),
      kind,
      name: name.trim(),
      symbol,
      photoId,
      showPhoto: Boolean(photoId) && !symbol,
      seeded: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      ...(kind === 'person' ? { birthday: null } : {}),
      ...(kind === 'place' ? { placeType: 'other' as const } : {}),
      ...(kind === 'food' ? { meals: [] } : {}),
      ...(defaultCategory(kind) ? { category: defaultCategory(kind) as string } : {}),
      ...extra,
    }
    await db.putItem(item)
    this.set({ items: { ...this.state.items, [item.id]: item } })
    return item
  }

  async updateItem(id: Id, patch: Partial<LibraryItem>) {
    const cur = this.state.items[id]
    if (!cur) return
    const next = { ...cur, ...patch, updatedAt: stamp() }
    await db.putItem(next)
    this.set({ items: { ...this.state.items, [id]: next } })
  }

  async setItemPhoto(id: Id, photo: Blob | null) {
    const cur = this.state.items[id]
    if (!cur) return
    if (cur.photoId) {
      await db.deleteBlob(cur.photoId)
      forgetUrl(cur.photoId)
    }
    let photoId: Id | null = null
    if (photo) {
      photoId = db.newId()
      const small = await shrinkImage(photo)
      await db.putBlob(photoId, small)
      primeUrl(photoId, small)
    }
    await this.updateItem(id, { photoId, showPhoto: Boolean(photoId) })
  }

  toggleItemPhoto(id: Id) {
    const cur = this.state.items[id]
    if (!cur?.photoId) return
    void this.updateItem(id, { showPhoto: !cur.showPhoto })
  }

  async deleteItem(id: Id) {
    const cur = this.state.items[id]
    if (!cur) return
    await this.updateItem(id, { deleted: true })
    this.toast(`${cur.name} removed`, () => void this.restoreItem(id))
  }

  async restoreItem(id: Id) {
    await this.updateItem(id, { deleted: false })
  }

  /**
   * A kind's words in display order: by `order`, then name. Seeds carry their
   * list index, so words the family added (no order yet) follow them by name
   * until someone reorders a shelf. `category` narrows to one shelf.
   */
  itemsOfKind(kind: LibraryKind, category?: string): LibraryItem[] {
    return Object.values(this.state.items)
      .filter(i => i.kind === kind && !i.deleted && (category === undefined || categoryOf(i) === category))
      .sort(byOrder)
  }

  /** Removed words of a kind, most recently removed first (Family → Words → Removed). */
  deletedOfKind(kind: LibraryKind): LibraryItem[] {
    return Object.values(this.state.items)
      .filter(i => i.kind === kind && i.deleted)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  /** Save a new order for these words (one shelf, in the order given). Only words that moved are written. */
  async reorderItems(ids: Id[]) {
    const now = stamp()
    const changed: LibraryItem[] = []
    ids.forEach((id, i) => {
      const cur = this.state.items[id]
      if (cur && cur.order !== i * 10) changed.push({ ...cur, order: i * 10, updatedAt: now })
    })
    if (!changed.length) return
    await db.putItems(changed)
    this.set({ items: { ...this.state.items, ...byId(changed) } })
  }

  /** Places Frankie can be staying at, home first. */
  stayPlaces(): LibraryItem[] {
    const home = this.state.settings.homePlaceId
    return this.itemsOfKind('place')
      .filter(p => p.stayable)
      .sort((a, b) => (a.id === home ? -1 : b.id === home ? 1 : 0))
  }

  // ---------- days & template ----------

  dayRecord(date: ISODate): DayRecord {
    return (
      this.state.days[date] ?? {
        date,
        stayingAtId: null,
        templateApplied: false,
        updatedAt: new Date(0).toISOString(),
      }
    )
  }

  stayingAt(date: ISODate): LibraryItem | null {
    const id = this.dayRecord(date).stayingAtId ?? this.state.settings.homePlaceId
    return id ? this.state.items[id] ?? null : null
  }

  async setStayingAt(date: ISODate, placeId: Id | null) {
    const rec = { ...this.dayRecord(date), stayingAtId: placeId, updatedAt: stamp() }
    await db.putDay(rec)
    this.set({ days: { ...this.state.days, [date]: rec } })
  }

  private virtualTemplate(date: ISODate): DiaryEvent[] {
    return this.state.settings.template.map((t, i) => ({
      id: `tpl:${date}:${t.type}`,
      date,
      type: t.type,
      time: t.time,
      order: i * 10,
      activityId: null,
      travelId: null,
      foodIds: [],
      placeId: null,
      personIds: [],
      done: false,
      rating: null,
      fromTemplate: true,
      deleted: false,
      createdAt: '',
      updatedAt: '',
    }))
  }

  private byDateCache: { events: Record<Id, DiaryEvent>; map: Map<ISODate, DiaryEvent[]> } | null = null

  /**
   * Stored (not deleted) events grouped by day. Rebuilt only when the events
   * object changes, so the month carousel's ~126 days don't each scan every event.
   */
  eventsByDate(): Map<ISODate, DiaryEvent[]> {
    const events = this.state.events
    if (this.byDateCache?.events !== events) {
      const map = new Map<ISODate, DiaryEvent[]>()
      for (const e of Object.values(events)) {
        if (e.deleted) continue
        const list = map.get(e.date)
        if (list) list.push(e)
        else map.set(e.date, [e])
      }
      this.byDateCache = { events, map }
    }
    return this.byDateCache.map
  }

  /** Stored events plus the routine template for days not yet materialised, in list order. */
  eventsFor(date: ISODate): DiaryEvent[] {
    const stored = [...(this.eventsByDate().get(date) ?? [])]
    const rec = this.dayRecord(date)
    const list = rec.templateApplied ? stored : [...stored, ...this.virtualTemplate(date)]
    return list.sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || timeKey(a) - timeKey(b) || a.createdAt.localeCompare(b.createdAt))
  }

  /** Write the routine template into a day so its events can be edited. Returns the id map. */
  async materializeDay(date: ISODate): Promise<Record<string, Id>> {
    const rec = this.dayRecord(date)
    if (rec.templateApplied) return {}
    const now = stamp()
    const map: Record<string, Id> = {}
    const evs = this.virtualTemplate(date).map(v => {
      const id = db.newId()
      map[v.id] = id
      return { ...v, id, createdAt: now, updatedAt: now }
    })
    const nextRec = { ...rec, templateApplied: true, updatedAt: now }
    await db.putEvents(evs)
    await db.putDay(nextRec)
    this.set({
      events: { ...this.state.events, ...byId(evs) },
      days: { ...this.state.days, [date]: nextRec },
    })
    return map
  }

  private async resolveEventId(date: ISODate, id: Id): Promise<Id> {
    if (!isVirtualId(id)) return id
    const map = await this.materializeDay(date)
    return map[id] ?? id
  }

  // ---------- events ----------

  async addEvent(input: {
    date: ISODate
    type: EventType
    time?: HHMM | null
    activityId?: Id | null
    travelId?: Id | null
    foodIds?: Id[]
    placeId?: Id | null
    personIds?: Id[]
  }): Promise<DiaryEvent> {
    await this.materializeDay(input.date)
    const now = stamp()
    const existing = this.eventsFor(input.date)
    const ev: DiaryEvent = {
      id: db.newId(),
      date: input.date,
      type: input.type,
      time: input.time ?? null,
      order: existing.length ? Math.max(...existing.map(e => e.order ?? 0)) + 10 : 0,
      activityId: input.activityId ?? null,
      travelId: input.travelId ?? null,
      foodIds: input.foodIds ?? [],
      placeId: input.placeId ?? null,
      personIds: input.personIds ?? [],
      done: false,
      rating: null,
      fromTemplate: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    }
    await db.putEvent(ev)
    this.set({ events: { ...this.state.events, [ev.id]: ev } })
    return ev
  }

  async updateEvent(date: ISODate, id: Id, patch: Partial<DiaryEvent>) {
    const realId = await this.resolveEventId(date, id)
    const cur = this.state.events[realId]
    if (!cur) return
    const next = { ...cur, ...patch, updatedAt: stamp() }
    await db.putEvent(next)
    this.set({ events: { ...this.state.events, [realId]: next } })
  }

  /** Write positions for a day's list (index * 10), touching only rows that moved. */
  private async writeOrder(ordered: DiaryEvent[], cleared: Set<Id> = new Set()) {
    const now = stamp()
    const changed: DiaryEvent[] = []
    ordered.forEach((e, i) => {
      const order = i * 10
      const time = cleared.has(e.id) ? null : e.time
      if (e.order !== order || time !== e.time) changed.push({ ...e, order, time, updatedAt: now })
    })
    if (!changed.length) return
    await db.putEvents(changed)
    this.set({ events: { ...this.state.events, ...byId(changed) } })
  }

  /**
   * Drag an event to a new position. Order is what matters: if the move puts a
   * timed event before/after others in a way its time contradicts, that event
   * and the ones it clashes with lose their times.
   */
  async moveEvent(date: ISODate, id: Id, toIndex: number) {
    // resolveEventId materialises the day if needed and maps a placeholder id to the real one.
    const realId = await this.resolveEventId(date, id)
    const list = this.eventsFor(date)
    const from = list.findIndex(e => e.id === realId)
    if (from < 0) return
    const [moved] = list.splice(from, 1)
    const idx = Math.max(0, Math.min(toIndex, list.length))
    list.splice(idx, 0, moved)
    const cleared = new Set<Id>()
    if (moved.time) {
      const t = minutesOf(moved.time)
      list.forEach((e, i) => {
        if (!e.time || e.id === moved.id) return
        const m = minutesOf(e.time)
        if ((i < idx && m > t) || (i > idx && m < t)) cleared.add(e.id)
      })
      if (cleared.size) cleared.add(moved.id)
    }
    await this.writeOrder(list, cleared)
  }

  /** Give an event a time (or remove it); it slides to where that time belongs in the list. */
  async setEventTime(date: ISODate, id: Id, time: HHMM | null) {
    const realId = await this.resolveEventId(date, id)
    const list = this.eventsFor(date)
    const cur = list.find(e => e.id === realId)
    if (!cur) return
    const updated = { ...cur, time }
    const rest = list.filter(e => e.id !== realId)
    let idx = rest.length
    if (time) {
      const t = minutesOf(time)
      // after the last timed event that starts at or before this time
      let last = -1
      rest.forEach((e, i) => {
        if (e.time && minutesOf(e.time) <= t) last = i
      })
      idx = last + 1
      if (last < 0) {
        // before the first timed event that starts later (untimed ones ahead stay ahead)
        const firstLater = rest.findIndex(e => e.time && minutesOf(e.time) > t)
        idx = firstLater < 0 ? rest.length : firstLater
      }
    }
    rest.splice(idx, 0, updated)
    await this.updateEvent(date, realId, { time })
    await this.writeOrder(rest.map(e => (e.id === realId ? { ...e, time } : e)))
  }

  async rateEvent(date: ISODate, id: Id, rating: Rating | null) {
    await this.updateEvent(date, id, { rating })
  }

  async deleteEvent(date: ISODate, id: Id, word: string) {
    const realId = await this.resolveEventId(date, id)
    await this.updateEvent(date, realId, { deleted: true })
    this.toast(`${word} removed`, () => void this.updateEvent(date, realId, { deleted: false }))
  }

  // ---------- photos ----------

  async addPhoto(date: ISODate, file: Blob, eventId: Id | null = null): Promise<PhotoRecord> {
    const id = db.newId()
    const small = await shrinkImage(file)
    await db.putBlob(id, small)
    primeUrl(id, small)
    const now = stamp()
    const rec: PhotoRecord = { id, date, eventId, deleted: false, createdAt: now, updatedAt: now }
    await db.putPhoto(rec)
    this.set({ photos: { ...this.state.photos, [id]: rec } })
    return rec
  }

  async deletePhoto(id: Id) {
    const cur = this.state.photos[id]
    if (!cur) return
    const setDeleted = async (deleted: boolean) => {
      const next = { ...cur, deleted, updatedAt: stamp() }
      await db.putPhoto(next)
      this.set({ photos: { ...this.state.photos, [id]: next } })
    }
    await setDeleted(true)
    this.toast('Photo removed', () => void setDeleted(false))
  }

  photosFor(date: ISODate): PhotoRecord[] {
    return Object.values(this.state.photos)
      .filter(p => p.date === date && !p.deleted)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  allPhotos(): PhotoRecord[] {
    return Object.values(this.state.photos)
      .filter(p => !p.deleted)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }

  // ---------- settings ----------

  async updateSettings(patch: Partial<Settings>) {
    const next = { ...this.state.settings, ...patch, updatedAt: stamp() }
    await db.putSettings(next)
    this.set({ settings: next })
  }

  async setTemplate(template: TemplateItem[]) {
    await this.updateSettings({ template })
  }

  async resetEverything() {
    await db.clearAll()
    this.set({ ...initialState, loading: true, view: { kind: 'today' } })
    await this.load({ migrate: this.canMigrate })
  }

  exportJSON(): string {
    const { items, events, days, photos, settings } = this.state
    return JSON.stringify({ exportedAt: stamp(), items, events, days, photos, settings }, null, 2)
  }

  // ---------- sync ----------

  localRecord(coll: db.Collection, record: db.Record_): db.Record_ | null {
    switch (coll) {
      case 'items':
        return this.state.items[(record as LibraryItem).id] ?? null
      case 'events':
        return this.state.events[(record as DiaryEvent).id] ?? null
      case 'days':
        return this.state.days[(record as DayRecord).date] ?? null
      case 'photos':
        return this.state.photos[(record as PhotoRecord).id] ?? null
      case 'settings':
        return this.state.settings
    }
  }

  /** A record that arrived from the cloud (already written locally). */
  applyRemote(coll: db.Collection, record: db.Record_) {
    switch (coll) {
      case 'items': {
        const r = record as LibraryItem
        this.set({ items: { ...this.state.items, [r.id]: r } })
        break
      }
      case 'events': {
        const r = record as DiaryEvent
        this.set({ events: { ...this.state.events, [r.id]: r } })
        break
      }
      case 'days': {
        const r = record as DayRecord
        this.set({ days: { ...this.state.days, [r.date]: r } })
        break
      }
      case 'photos': {
        const r = record as PhotoRecord
        this.set({ photos: { ...this.state.photos, [r.id]: r } })
        break
      }
      case 'settings':
        this.set({ settings: record as Settings })
        // Old settings from another device may need migrating, but only once
        // we have caught up with the cloud (else see load()).
        if (this.canMigrate) void this.migrate()
        break
    }
  }

  // ---------- derived ----------

  /** People whose birthday is on this date (a 29 February birthday shows on the 28th in other years). */
  birthdaysOn(date: ISODate): LibraryItem[] {
    const md = date.slice(5)
    const leapDayToo = md === '02-28' && !isLeap(Number(date.slice(0, 4)))
    return this.itemsOfKind('person').filter(p => p.birthday === md || (leapDayToo && p.birthday === '02-29'))
  }

  /** Everyone with a birthday, soonest first from `from` (today counts as 0 days away). */
  upcomingBirthdays(from: ISODate): UpcomingBirthday[] {
    const start = fromISO(from)
    const out: UpcomingBirthday[] = []
    for (const person of this.itemsOfKind('person')) {
      if (!person.birthday || !/^\d\d-\d\d$/.test(person.birthday)) continue
      let y = start.getFullYear()
      let date = birthdayIn(person.birthday, y)
      if (date < from) date = birthdayIn(person.birthday, ++y)
      const daysAway = Math.round((fromISO(date).getTime() - start.getTime()) / 86_400_000)
      out.push({ person, date, daysAway, age: person.birthYear ? y - person.birthYear : null })
    }
    return out.sort((a, b) => a.daysAway - b.daysAway || a.person.name.localeCompare(b.person.name))
  }
}

export interface UpcomingBirthday {
  person: LibraryItem
  /** The next date it falls on. */
  date: ISODate
  daysAway: number
  /** The age they turn, if the year of birth is known. */
  age: number | null
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

/** A MM-DD birthday in a given year (29 February → the 28th when there is none). */
function birthdayIn(md: string, y: number): ISODate {
  const [m, d] = md.split('-').map(Number)
  const day = m === 2 && d === 29 && !isLeap(y) ? 28 : d
  return toISO(new Date(y, m - 1, day))
}

const byOrder = (a: LibraryItem, b: LibraryItem) => (a.order ?? 1e6) - (b.order ?? 1e6) || a.name.localeCompare(b.name)

export const store = new Store()

// ------------------------------------------------------------
// React bindings
// ------------------------------------------------------------

export const StoreContext = createContext<Store>(store)

/** Subscribe to the store; re-renders on every change (state is small). */
export function useStore(): Store {
  const s = useContext(StoreContext)
  const [, bump] = useState(0)
  useEffect(() => s.subscribe(() => bump(n => n + 1)), [s])
  return s
}
