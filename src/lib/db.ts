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
  /** Photo ids still to be uploaded once online. */
  outbox: { key: string; value: { id: string } }
}

const DB_NAME = 'frankies-diary'
const DB_VERSION = 2

export type Collection = 'items' | 'events' | 'days' | 'photos' | 'settings'
export type Record_ = LibraryItem | DiaryEvent | DayRecord | PhotoRecord | Settings

/** Called after every local write so the sync layer can push it (see sync.ts). */
type WriteHook = (collection: Collection, record: Record_) => void
type BlobHook = (id: string) => void
let writeHook: WriteHook | null = null
let blobHook: BlobHook | null = null
export function setWriteHooks(onWrite: WriteHook | null, onBlob: BlobHook | null) {
  writeHook = onWrite
  blobHook = onBlob
}

let dbPromise: Promise<IDBPDatabase<DiaryDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DiaryDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const items = db.createObjectStore('items', { keyPath: 'id' })
          items.createIndex('kind', 'kind')
          const events = db.createObjectStore('events', { keyPath: 'id' })
          events.createIndex('date', 'date')
          db.createObjectStore('days', { keyPath: 'date' })
          const photos = db.createObjectStore('photos', { keyPath: 'id' })
          photos.createIndex('date', 'date')
          db.createObjectStore('blobs', { keyPath: 'id' })
          db.createObjectStore('settings', { keyPath: 'id' })
        }
        if (oldVersion < 2) {
          db.createObjectStore('outbox', { keyPath: 'id' })
        }
      },
      // Ready for a future version bump: an open tab running the old version
      // steps aside so a newer one can upgrade, then reloads into it.
      blocking() {
        void dbPromise?.then(db => db.close())
        location.reload()
      },
      terminated() {
        location.reload()
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

/** `silent` = a record arriving FROM sync; don't echo it back. */
export async function putItem(item: LibraryItem, silent = false) {
  await (await getDB()).put('items', item)
  if (!silent) writeHook?.('items', item)
}
export async function putItems(items: LibraryItem[], silent = false) {
  const tx = (await getDB()).transaction('items', 'readwrite')
  await Promise.all([...items.map(i => tx.store.put(i)), tx.done])
  if (!silent) items.forEach(i => writeHook?.('items', i))
}
export async function putEvent(ev: DiaryEvent, silent = false) {
  await (await getDB()).put('events', ev)
  if (!silent) writeHook?.('events', ev)
}
export async function putEvents(evs: DiaryEvent[], silent = false) {
  const tx = (await getDB()).transaction('events', 'readwrite')
  await Promise.all([...evs.map(e => tx.store.put(e)), tx.done])
  if (!silent) evs.forEach(e => writeHook?.('events', e))
}
export async function putDay(day: DayRecord, silent = false) {
  await (await getDB()).put('days', day)
  if (!silent) writeHook?.('days', day)
}
export async function putPhoto(photo: PhotoRecord, silent = false) {
  await (await getDB()).put('photos', photo)
  if (!silent) writeHook?.('photos', photo)
}
export async function putSettings(s: Settings, silent = false) {
  await (await getDB()).put('settings', s)
  if (!silent) writeHook?.('settings', s)
}
export async function putBlob(id: string, blob: Blob, silent = false) {
  const db = await getDB()
  await db.put('blobs', { id, blob })
  if (!silent) {
    await db.put('outbox', { id })
    blobHook?.(id)
  }
}
export async function getBlob(id: string): Promise<Blob | null> {
  const rec = await (await getDB()).get('blobs', id)
  return rec?.blob ?? null
}
export async function deleteBlob(id: string) {
  await (await getDB()).delete('blobs', id)
}
export async function outboxIds(): Promise<string[]> {
  return (await (await getDB()).getAllKeys('outbox')) as string[]
}
export async function outboxDone(id: string) {
  await (await getDB()).delete('outbox', id)
}

/** Wipe everything (family settings → "Start again"). */
export async function clearAll() {
  const db = await getDB()
  const tx = db.transaction(['items', 'events', 'days', 'photos', 'blobs', 'settings', 'outbox'], 'readwrite')
  await Promise.all([
    tx.objectStore('items').clear(),
    tx.objectStore('events').clear(),
    tx.objectStore('days').clear(),
    tx.objectStore('photos').clear(),
    tx.objectStore('blobs').clear(),
    tx.objectStore('settings').clear(),
    tx.objectStore('outbox').clear(),
    tx.done,
  ])
}

export function newId(): string {
  return crypto.randomUUID()
}
