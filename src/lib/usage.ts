import { useSyncExternalStore } from 'react'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ISODate, UsageDay } from '../types'
import { today } from './dates'
import { deviceId, deviceLabel, isFrankiesTablet } from './device'

/**
 * Usage stats (backlog item 5): which parts of the app are used, and how
 * often. Counts only, never content, and nothing while Family mode is on
 * (that is the family, not Frankie).
 *
 * A small module store of its own, NOT part of the diary's state: every tap
 * would otherwise re-render the whole app (three day panels on the tablet).
 * Only the stats screen subscribes. Kept in its own IndexedDB database, so
 * the diary's database needs no upgrade, and synced as one small doc per
 * device per day (sync.ts sets the pusher; there is no listener, so other
 * devices' counts never stream into the tablet).
 *
 * Two tabs open on one device can overwrite each other's counts for that
 * day; the loss is small and accepted.
 */

/** Every part counted, with the words the stats screen shows. Keys use underscores only (Firestore field names). */
export const USAGE_LABELS = {
  view_today: 'Today screen',
  view_week: 'Week screen',
  view_month: 'Month screen',
  view_photos: 'Photos screen',
  view_day: 'Opened a day',
  nav_swipe: 'Swiped day or month',
  nav_arrow: 'Arrows (day, week, month)',
  add_open: 'Tapped +',
  add_activity: 'Added activity',
  add_meal: 'Added meal',
  add_travel: 'Added travel',
  add_routine: 'Added routine item',
  add_cancel: 'Tapped No while adding',
  event_open: 'Opened a row',
  event_time: 'Set a time',
  event_rate: 'Rated a row',
  event_move: 'Moved a row',
  event_remove: 'Removed a row',
  photo_add: 'Added a photo',
  photo_view: 'Looked at a photo',
  tile_flip: 'Flipped a tile',
  word_new: 'Made a new word',
  word_web: 'Used a web picture',
  try_open: 'Opened Try',
  try_add: 'Added an idea',
  try_demo: 'Watched the demo',
  stay_change: 'Changed Staying at',
} as const

export type UsageKey = keyof typeof USAGE_LABELS

/** Save to this device's database this soon after a count (cheap, and a reload loses nothing). */
const SAVE_MS = 2_000
/** Push to the cloud at most this often while in use (and at once when the app is hidden). */
const PUSH_MS = 60_000
/** Back after this long away (hidden, or no taps) counts as a new session. */
const SESSION_GAP_MS = 5 * 60_000

const DB_NAME = 'frankies-diary-usage'

interface UsageDB extends DBSchema {
  days: { key: string; value: LocalUsageDay }
}

/** The local copy remembers when it was last pushed (never sent to the cloud). */
type LocalUsageDay = UsageDay & { pushedAt?: string }

let dbPromise: Promise<IDBPDatabase<UsageDB>> | null = null
function getDB() {
  dbPromise ??= openDB<UsageDB>(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore('days', { keyPath: 'id' })
    },
  })
  return dbPromise
}

const docs = new Map<string, LocalUsageDay>()
/** Days changed since they were last saved here, and since they were last pushed. */
const dirty = new Set<string>()
const unpushed = new Set<string>()
const listeners = new Set<() => void>()
let snapshot: UsageDay[] = []
let paused = false
let started = false
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null
/** Last tap or return to the app (ms), for sessions. */
let lastActive = 0
/** The minute (ms / 60000) of the last counted tap. A reload within the same minute may count it twice. */
let lastMinute = -1
let pusher: ((u: UsageDay) => Promise<void>) | null = null

function emit() {
  snapshot = [...docs.values()]
  listeners.forEach(fn => fn())
}

/** Today's doc for this device, made if need be. */
function todays(): LocalUsageDay {
  const date = today()
  const id = `${deviceId()}_${date}`
  let d = docs.get(id)
  if (!d) {
    d = { id, deviceId: deviceId(), deviceLabel: deviceLabel(), frankie: isFrankiesTablet(), date, counts: {}, sessions: 0, minutes: 0, updatedAt: '' }
    docs.set(id, d)
  }
  return d
}

function bump(change: (d: LocalUsageDay) => void) {
  const d = todays()
  change(d)
  // The device's name and flag as they are now: the family may have set them since this morning.
  d.deviceLabel = deviceLabel()
  d.frankie = isFrankiesTablet()
  d.updatedAt = new Date().toISOString()
  dirty.add(d.id)
  unpushed.add(d.id)
  saveTimer ??= setTimeout(() => void save(), SAVE_MS)
  pushTimer ??= setTimeout(() => void pushChanged(), PUSH_MS)
  emit()
}

/** Count one use of a part of the app (not while Family mode is on). */
export function track(key: UsageKey) {
  if (paused) return
  bump(d => {
    d.counts[key] = (d.counts[key] ?? 0) + 1
  })
}

/** Family mode on: nothing is counted until it goes off again. */
export function setUsagePaused(on: boolean) {
  paused = on
}

/** A tap anywhere: an active minute, and a new session after a while away. */
function onTap() {
  const now = Date.now()
  const away = now - lastActive >= SESSION_GAP_MS
  lastActive = now
  if (paused) return
  const minute = Math.floor(now / 60_000)
  if (minute === lastMinute && !away) return
  lastMinute = minute
  bump(d => {
    d.minutes += 1
    if (away) d.sessions += 1
  })
}

/** Start counting: load this device's days, count the session, listen for taps and leaving. */
export async function startUsage() {
  if (started) return
  started = true
  lastActive = Date.now()
  document.addEventListener('pointerdown', onTap, { passive: true, capture: true })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void persist()
      return
    }
    const now = Date.now()
    if (now - lastActive >= SESSION_GAP_MS && !paused) bump(d => (d.sessions += 1))
    lastActive = now
  })
  window.addEventListener('pagehide', () => void persist())
  try {
    const db = await getDB()
    for (const d of await db.getAll('days')) {
      // A count made before the load finished is added to what was saved.
      const cur = docs.get(d.id)
      if (cur) {
        for (const [k, n] of Object.entries(d.counts)) cur.counts[k] = (cur.counts[k] ?? 0) + n
        cur.sessions += d.sessions
        cur.minutes += d.minutes
      } else docs.set(d.id, d)
    }
  } catch {
    // No local database (private window): counts stay in memory for this visit.
  }
  if (!paused) bump(d => (d.sessions += 1))
  emit()
}

/** Leaving (hidden, or the page going): save and push now. */
async function persist() {
  await save()
  await pushChanged()
}

/** Write changed days to this device's database. */
async function save() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
  if (!dirty.size) return
  const changed = [...dirty].map(id => docs.get(id)).filter((d): d is LocalUsageDay => Boolean(d))
  dirty.clear()
  try {
    const db = await getDB()
    const tx = db.transaction('days', 'readwrite')
    await Promise.all([...changed.map(d => tx.store.put({ ...d, counts: { ...d.counts } })), tx.done])
  } catch {
    // storage unavailable
  }
}

/** Push the days changed since their last push, if sync is ready. */
async function pushChanged() {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = null
  const changed = [...unpushed].map(id => docs.get(id)).filter((d): d is LocalUsageDay => Boolean(d))
  unpushed.clear()
  for (const d of changed) void push(d)
}

async function push(d: LocalUsageDay) {
  if (!pusher) return
  const stampAtPush = d.updatedAt
  try {
    await pusher(toDoc(d))
    // Remembered locally (saved with the next write) so flushUnsent skips it.
    d.pushedAt = stampAtPush
    dirty.add(d.id)
    saveTimer ??= setTimeout(() => void save(), SAVE_MS)
  } catch {
    // Offline or refused: flushUnsent tries again next time sync is ready.
  }
}

/** The doc as synced: without the local-only pushedAt, and a copy (counts change under it). */
const toDoc = (d: LocalUsageDay): UsageDay => ({
  id: d.id,
  deviceId: d.deviceId,
  deviceLabel: d.deviceLabel,
  frankie: d.frankie,
  date: d.date,
  counts: { ...d.counts },
  sessions: d.sessions,
  minutes: d.minutes,
  updatedAt: d.updatedAt,
})

/**
 * Set by the sync layer when it is ready (null when it stops). Setting it
 * pushes every day of this device changed since its last push.
 */
export function setUsagePusher(fn: ((u: UsageDay) => Promise<void>) | null) {
  pusher = fn
  if (fn) void flushUnsent()
}

export async function flushUnsent() {
  if (!pusher) return
  for (const d of docs.values()) {
    if (d.deviceId === deviceId() && (!d.pushedAt || d.updatedAt > d.pushedAt)) await push(d)
  }
}

/** This device's days (and any fetched from the cloud are merged in by the stats screen). */
export function localUsage(): UsageDay[] {
  return snapshot
}

/** Days on or after `from` (for exports and the stats screen). */
export function usageSince(from: ISODate): UsageDay[] {
  return snapshot.filter(d => d.date >= from)
}

/** Family settings → Start again: this device's counts go too. */
export async function clearUsage() {
  docs.clear()
  dirty.clear()
  unpushed.clear()
  try {
    await (await getDB()).clear('days')
  } catch {
    // storage unavailable
  }
  emit()
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** This device's usage days, re-rendering when they change. */
export function useUsage(): UsageDay[] {
  return useSyncExternalStore(subscribe, () => snapshot)
}
