import type { ISODate } from '../types'
import { toISO } from './dates'

/** A special day shown on the day, week and month views (a symbol, one word and its own colours). */
export interface Festive {
  key: 'christmas' | 'easter' | 'halloween'
  word: string
  symbol: string
  /** Tailwind classes: the band / cell background and its edge. */
  bg: string
  border: string
}

interface FestiveDay extends Festive {
  on: (year: number) => ISODate
}

/**
 * The festive days, one line each (add more here). Halloween's edge is ink,
 * not orange: orange edges already mean "today".
 */
const FESTIVE_DAYS: FestiveDay[] = [
  { key: 'christmas', word: 'Christmas', symbol: 'mb:Christmas_tree', bg: 'bg-green-light', border: 'border-green', on: y => `${y}-12-25` },
  { key: 'easter', word: 'Easter', symbol: 'mb:Easter_egg', bg: 'bg-lilac-light', border: 'border-lilac', on: y => easterSunday(y) },
  { key: 'halloween', word: 'Halloween', symbol: 'mb:pumpkin_lantern', bg: 'bg-orange-light', border: 'border-ink', on: y => `${y}-10-31` },
]

/** Easter Sunday in the Western (Gregorian) calendar: the anonymous Gregorian algorithm. */
export function easterSunday(year: number): ISODate {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return toISO(new Date(year, month - 1, day))
}

/** The festive day on `date`, if there is one. */
export function festiveOn(date: ISODate): Festive | null {
  const year = Number(date.slice(0, 4))
  const hit = FESTIVE_DAYS.find(f => f.on(year) === date)
  if (!hit) return null
  const { key, word, symbol, bg, border } = hit
  return { key, word, symbol, bg, border }
}
