import type { ISODate } from '../types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function today(): ISODate {
  return toISO(new Date())
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function addMonths(s: ISODate, n: number): ISODate {
  const d = fromISO(s)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return toISO(d)
}

/** Monday of the week containing `s`. */
export function startOfWeek(s: ISODate): ISODate {
  const d = fromISO(s)
  const dow = (d.getDay() + 6) % 7 // Mon = 0
  return addDays(s, -dow)
}

export function weekDates(s: ISODate): ISODate[] {
  const start = startOfWeek(s)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function startOfMonth(s: ISODate): ISODate {
  return s.slice(0, 8) + '01'
}

/** Dates for a Mon–Sun month grid, padded with neighbouring days (null for padding). */
export function monthGrid(s: ISODate): (ISODate | null)[] {
  const first = startOfMonth(s)
  const d = fromISO(first)
  const lead = (d.getDay() + 6) % 7
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const cells: (ISODate | null)[] = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let i = 0; i < daysInMonth; i++) cells.push(addDays(first, i))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(s: ISODate): number {
  return (fromISO(s).getDay() + 6) % 7
}

export function dayName(s: ISODate): string {
  return DAY_NAMES[weekdayIndex(s)]
}

export function dayNumber(s: ISODate): number {
  return fromISO(s).getDate()
}

export function monthName(s: ISODate): string {
  return MONTH_NAMES[fromISO(s).getMonth()]
}

export function year(s: ISODate): number {
  return fromISO(s).getFullYear()
}

/** "Tuesday 22 September 2026" */
export function longDate(s: ISODate): string {
  return `${dayName(s)} ${dayNumber(s)} ${monthName(s)} ${year(s)}`
}

/** "MM-DD" of a date, for birthday matching. */
export function monthDay(s: ISODate): string {
  return s.slice(5)
}
