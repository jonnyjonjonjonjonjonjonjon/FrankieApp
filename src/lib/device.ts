/**
 * Per-device settings that must NOT sync: whether this device is Frankie's
 * tablet (only it shows the charge prompt). Stored in localStorage.
 */
const KEY = 'frankies-diary-device'

export function isFrankiesTablet(): boolean {
  try {
    return localStorage.getItem(KEY) === 'tablet'
  } catch {
    return false
  }
}

export function setFrankiesTablet(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, 'tablet')
    else localStorage.removeItem(KEY)
  } catch {
    // storage unavailable
  }
}

/** Local-only blob id for the photo shown on the charge prompt. */
export const CHARGER_PHOTO_ID = 'device-charger-photo'

/** Show the charge prompt at or below this level (0-1). */
export const CHARGE_AT = 0.15
