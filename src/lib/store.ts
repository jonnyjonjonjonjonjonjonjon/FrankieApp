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
import { seedItems, HOME_PLACE_ID } from './seed'
import { shrinkImage, primeUrl, forgetUrl } from './images'
import { minutesOf } from './time'

const timeKey = (e: DiaryEvent) => (e.time ? minutesOf(e.time) : 1e6)
import { today } from './dates'

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

  async load() {
    const data = await db.loadAll()
    let items = data.items
    let settings = data.settings
    // Boot-time defaults are written silently with an old timestamp so any
    // version already in the cloud wins when sync connects.
    if (items.length === 0) {
      items = seedItems(new Date(0).toISOString())
      await db.putItems(items, true)
    }
    if (!settings.homePlaceId) {
      settings = { ...settings, homePlaceId: HOME_PLACE_ID, updatedAt: new Date(1).toISOString() }
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
    await this.migrate()
  }

  /**
   * One-off tidy-ups for diaries saved by earlier versions (synced, so every
   * device ends up the same):
   *  v2 (Sept 2026): "Wake up" left the default routine.
   *  v3 (Sept 2026): stay places — Rochester Road / Eastbourne / Jon's house /
   *     Hotel are marked as places Frankie can stay; seeded items get an order.
   */
  async migrate() {
    const s = this.state.settings
    const version = s.templateVersion ?? 1
    if (version >= 4) return
    if (version >= 3) {
      await this.migrateV4()
      return
    }
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
    await this.migrateV4()
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
      ...(kind === 'person' ? { role: 'friend' as const, birthday: null } : {}),
      ...(kind === 'place' ? { placeType: 'other' as const } : {}),
      ...(kind === 'food' ? { meals: [] } : {}),
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
    this.toast(`${cur.name} removed`, () => void this.updateItem(id, { deleted: false }))
  }

  itemsOfKind(kind: LibraryKind): LibraryItem[] {
    return Object.values(this.state.items)
      .filter(i => i.kind === kind && !i.deleted)
      .sort((a, b) => {
        if (a.seeded !== b.seeded) return a.seeded ? -1 : 1
        if (a.seeded) return (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name)
        return a.name.localeCompare(b.name)
      })
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

  /** Stored events plus the routine template for days not yet materialised, in list order. */
  eventsFor(date: ISODate): DiaryEvent[] {
    const stored = Object.values(this.state.events).filter(e => e.date === date && !e.deleted)
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
    await this.materializeDay(date)
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
    await this.materializeDay(date)
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
    await this.load()
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
        void this.migrate()
        break
    }
  }

  // ---------- derived ----------

  birthdaysOn(date: ISODate): LibraryItem[] {
    const md = date.slice(5)
    return this.itemsOfKind('person').filter(p => p.birthday === md)
  }
}

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
