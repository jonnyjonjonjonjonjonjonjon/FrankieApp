import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DayRecord, DiaryEvent, LibraryItem, PhotoRecord, Settings } from '../types'
import { DEFAULT_TEMPLATE } from '../types'

/**
 * Local store. Every device keeps a full copy; a sync adapter (PRD §4.12,
 * Firebase/Supabase) will replay these same records with last-write-wins
 * on `updatedAt`. Deletes are soft (`deleted: true`) for that reason.
 */

interface DiaryDB extends DBSchema {
  items: { key: string; value: LibraryItem; indexes: { kind: string } }
  events: { key: string; value: DiaryEvent; indexes: { date: string } }
  days: { key: string; value: DayRecord }
  photos: { key: string; value: PhotoRecord; indexes: { date: string } }
  blobs: { key: string; value: { id: string; blob: Blob } }
  settings: { key: string; value: Settings }
}

const DB_NAME = 'frankies-diary'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<DiaryDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DiaryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const items = db.createObjectStore('items', { keyPath: 'id' })
        items.createIndex('kind', 'kind')
        const events = db.createObjectStore('events', { keyPath: 'id' })
        events.createIndex('date', 'date')
        db.createObjectStore('days', { keyPath: 'date' })
        const photos = db.createObjectStore('photos', { keyPath: 'id' })
        photos.createIndex('date', 'date')
        db.createObjectStore('blobs', { keyPath: 'id' })
        db.createObjectStore('settings', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  pin: null,
  template: DEFAULT_TEMPLATE,
  homePlaceId: null,
  updatedAt: new Date(0).toISOString(),
}

export async function loadAll() {
  const db = await getDB()
  const [items, events, days, photos, settings] = await Promise.all([
    db.getAll('items'),
    db.getAll('events'),
    db.getAll('days'),
    db.getAll('photos'),
    db.get('settings', 'settings'),
  ])
  return { items, events, days, photos, settings: settings ?? DEFAULT_SETTINGS }
}

export async function putItem(item: LibraryItem) {
  await (await getDB()).put('items', item)
}
export async function putItems(items: LibraryItem[]) {
  const tx = (await getDB()).transaction('items', 'readwrite')
  await Promise.all([...items.map(i => tx.store.put(i)), tx.done])
}
export async function putEvent(ev: DiaryEvent) {
  await (await getDB()).put('events', ev)
}
export async function putEvents(evs: DiaryEvent[]) {
  const tx = (await getDB()).transaction('events', 'readwrite')
  await Promise.all([...evs.map(e => tx.store.put(e)), tx.done])
}
export async function putDay(day: DayRecord) {
  await (await getDB()).put('days', day)
}
export async function putPhoto(photo: PhotoRecord) {
  await (await getDB()).put('photos', photo)
}
export async function putSettings(s: Settings) {
  await (await getDB()).put('settings', s)
}
export async function putBlob(id: string, blob: Blob) {
  await (await getDB()).put('blobs', { id, blob })
}
export async function getBlob(id: string): Promise<Blob | null> {
  const rec = await (await getDB()).get('blobs', id)
  return rec?.blob ?? null
}
export async function deleteBlob(id: string) {
  await (await getDB()).delete('blobs', id)
}

/** Wipe everything (family settings → "Start again"). */
export async function clearAll() {
  const db = await getDB()
  const tx = db.transaction(['items', 'events', 'days', 'photos', 'blobs', 'settings'], 'readwrite')
  await Promise.all([
    tx.objectStore('items').clear(),
    tx.objectStore('events').clear(),
    tx.objectStore('days').clear(),
    tx.objectStore('photos').clear(),
    tx.objectStore('blobs').clear(),
    tx.objectStore('settings').clear(),
    tx.done,
  ])
}

export function newId(): string {
  return crypto.randomUUID()
}
