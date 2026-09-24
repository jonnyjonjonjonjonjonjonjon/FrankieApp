import { useSyncExternalStore } from 'react'

/**
 * Per-device settings that must NOT sync: whether this device is Frankie's
 * tablet (only it shows the charge prompt), and its id and name for the usage
 * stats. Stored in localStorage.
 */
const KEY = 'frankies-diary-device'
const ID_KEY = 'frankies-diary-device-id'
const LABEL_KEY = 'frankies-diary-device-label'

export function isFrankiesTablet(): boolean {
  try {
    return localStorage.getItem(KEY) === 'tablet'
  } catch {
    return false
  }
}

const tabletListeners = new Set<() => void>()

export function setFrankiesTablet(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, 'tablet')
    else localStorage.removeItem(KEY)
  } catch {
    // storage unavailable
  }
  tabletListeners.forEach(fn => fn())
}

/** isFrankiesTablet() that re-renders when This device changes it (the stats' toggle, the web box). */
export function useFrankiesTablet(): boolean {
  return useSyncExternalStore(fn => {
    tabletListeners.add(fn)
    return () => void tabletListeners.delete(fn)
  }, isFrankiesTablet)
}

/** Kept for this page's life if storage is unavailable, so its counts still add up. */
let sessionId: string | null = null

/** A random id for this device (its usage docs are keyed by it). */
export function deviceId(): string {
  try {
    let id = localStorage.getItem(ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(ID_KEY, id)
    }
    return id
  } catch {
    return (sessionId ??= crypto.randomUUID())
  }
}

/** The name this device goes by in the usage stats: the family's own, else a guess. */
export function deviceLabel(): string {
  try {
    const own = localStorage.getItem(LABEL_KEY)?.trim()
    if (own) return own
  } catch {
    // storage unavailable
  }
  return defaultDeviceLabel()
}

/** Blank goes back to the guess. */
export function setDeviceLabel(label: string) {
  try {
    if (label.trim()) localStorage.setItem(LABEL_KEY, label.trim())
    else localStorage.removeItem(LABEL_KEY)
  } catch {
    // storage unavailable
  }
}

export function defaultDeviceLabel(): string {
  if (isFrankiesTablet()) return "Frankie's tablet"
  const ua = navigator.userAgent
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'Tablet'
  if (/Mobi|iPhone|Android/i.test(ua)) return 'Phone'
  return 'Computer'
}

/** Local-only blob id for the photo shown on the charge prompt. */
export const CHARGER_PHOTO_ID = 'device-charger-photo'

/** Show the charge prompt at or below this level (0-1). */
export const CHARGE_AT = 0.15
