import type { HHMM } from '../types'

export interface Time12 {
  hour: number // 1..12
  minute: number
  ampm: 'am' | 'pm'
  /** "5:30" */
  clock: string
  /** "5:30 pm" */
  text: string
}

export function parseHHMM(t: HHMM): { h: number; m: number } {
  const [h, m] = t.split(':').map(Number)
  return { h, m }
}

export function toHHMM(h: number, m: number): HHMM {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function to12(t: HHMM): Time12 {
  const { h, m } = parseHHMM(t)
  const ampm = h < 12 ? 'am' : 'pm'
  const hour = h % 12 === 0 ? 12 : h % 12
  const clock = `${hour}:${String(m).padStart(2, '0')}`
  return { hour, minute: m, ampm, clock, text: `${clock} ${ampm}` }
}

export function from12(hour: number, minute: number, ampm: 'am' | 'pm'): HHMM {
  let h = hour % 12
  if (ampm === 'pm') h += 12
  return toHHMM(h, minute)
}

export function minutesOf(t: HHMM): number {
  const { h, m } = parseHHMM(t)
  return h * 60 + m
}

export function nowHHMM(d = new Date()): HHMM {
  return toHHMM(d.getHours(), d.getMinutes())
}

/** Snap to the nearest half hour (used when Frankie picks a time). */
export function snapHalfHour(t: HHMM): HHMM {
  const mins = Math.round(minutesOf(t) / 30) * 30
  const clamped = Math.min(mins, 23 * 60 + 30)
  return toHHMM(Math.floor(clamped / 60), clamped % 60)
}

/** Sun from 6 am until 6 pm, moon otherwise (daylight, not am/pm). */
export function isDaytime(t: HHMM): boolean {
  const { h } = parseHHMM(t)
  return h >= 6 && h < 18
}
