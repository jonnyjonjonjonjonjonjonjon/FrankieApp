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
    if (items.length === 0) {
      items = seedItems()
      await db.putItems(items)
    }
    if (!settings.homePlaceId) {
      settings = { ...settings, homePlaceId: HOME_PLACE_ID, updatedAt: stamp() }
      await db.putSettings(settings)
    }
    this.set({
      loading: false,
      items: byId(items),
      events: byId(data.events),
      days: Object.fromEntries(data.days.map(d => [d.date, d])),
      photos: byId(data.photos),
      settings,
    })
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
      .sort((a, b) => (a.seeded === b.seeded ? a.name.localeCompare(b.name) : a.seeded ? -1 : 1))
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
    return this.state.settings.template.map(t => ({
      id: `tpl:${date}:${t.type}`,
      date,
      type: t.type,
      time: t.time,
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

  /** Stored events plus the routine template for days not yet materialised, in time order. */
  eventsFor(date: ISODate): DiaryEvent[] {
    const stored = Object.values(this.state.events).filter(e => e.date === date && !e.deleted)
    const rec = this.dayRecord(date)
    const list = rec.templateApplied ? stored : [...stored, ...this.virtualTemplate(date)]
    return list.sort((a, b) => minutesOf(a.time) - minutesOf(b.time) || a.createdAt.localeCompare(b.createdAt))
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
    time: HHMM
    activityId?: Id | null
    foodIds?: Id[]
    placeId?: Id | null
    personIds?: Id[]
  }): Promise<DiaryEvent> {
    await this.materializeDay(input.date)
    const now = stamp()
    const ev: DiaryEvent = {
      id: db.newId(),
      date: input.date,
      type: input.type,
      time: input.time,
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

  async toggleDone(date: ISODate, id: Id) {
    const realId = await this.resolveEventId(date, id)
    const cur = this.state.events[realId]
    if (!cur) return
    await this.updateEvent(date, realId, { done: !cur.done })
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
    const rec: PhotoRecord = { id, date, eventId, deleted: false, createdAt: stamp() }
    await db.putPhoto(rec)
    this.set({ photos: { ...this.state.photos, [id]: rec } })
    return rec
  }

  async deletePhoto(id: Id) {
    const cur = this.state.photos[id]
    if (!cur) return
    const setDeleted = async (deleted: boolean) => {
      const next = { ...cur, deleted }
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
