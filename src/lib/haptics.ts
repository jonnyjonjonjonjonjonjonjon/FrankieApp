/** Vibration only, never sound (PRD §6). */
export function buzz(pattern: number | number[] = 40) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // not supported
  }
}
