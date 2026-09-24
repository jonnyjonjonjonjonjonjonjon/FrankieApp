import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { addDays, DAY_SHORT, dayNumber, monthName, today, weekdayIndex } from '../../lib/dates'
import { deviceId, useFrankiesTablet } from '../../lib/device'
import { USAGE_LABELS, useUsage } from '../../lib/usage'
import { useSync } from '../../lib/useSync'
import type { ISODate, UsageDay } from '../../types'
import { BigButton } from '../ui/BigButton'

/** The two spans the stats can cover (days, today included). */
const RANGES = [7, 30] as const
type Range = (typeof RANGES)[number]

interface Remote {
  from: ISODate
  docs: UsageDay[] | null
}

const sum = (list: number[]) => list.reduce((a, b) => a + b, 0)
const taps = (d: UsageDay) => sum(Object.values(d.counts))
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** Two or more toggle buttons, one on (orange). */
function Choice<T extends string | number>({
  value,
  options,
  onChange,
  disabled = [],
}: {
  value: T
  options: [T, string][]
  onChange: (v: T) => void
  /** Options that can't be picked yet (greyed out). */
  disabled?: T[]
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, word]) => {
        const on = v === value
        return (
          <BigButton key={String(v)} size="sm" variant={on ? 'primary' : 'secondary'} aria-pressed={on} disabled={disabled.includes(v)} onClick={() => onChange(v)}>
            <span className={`text-xl font-extrabold ${on ? 'text-white' : ''}`}>{word}</span>
          </BigButton>
        )
      })}
    </div>
  )
}

function Stat({ value, word }: { value: string | number; word: string }) {
  // A number big; a label (the most used part) smaller, wrapping rather than cut off.
  const big = typeof value === 'number'
  return (
    <div className="flex min-w-0 flex-col justify-end rounded-2xl border-4 border-line px-3 py-2">
      <span className={`font-extrabold ${big ? 'text-4xl' : 'text-2xl leading-tight'}`}>{value}</span>
      <span className="text-lg font-bold text-ink-soft">{word}</span>
    </div>
  )
}

/**
 * Family settings → Frankie's use (backlog item 5): what parts of the diary
 * she uses and how often, from counts each device keeps (usage.ts). This
 * device's own counts are always here; with sync on, the other devices' are
 * read from the cloud when this opens (and on Refresh).
 */
export function UsageStats() {
  const local = useUsage()
  const sync = useSync()
  const tablet = useFrankiesTablet()
  const [range, setRange] = useState<Range>(7)
  const [scope, setScope] = useState<'frankie' | 'all'>('frankie')
  const [remote, setRemote] = useState<Remote | null>(null)
  const [refresh, setRefresh] = useState(0)
  const ready = sync.status === 'ready'
  // Always read 30 days: switching 7 ↔ 30 needs no second read.
  const readFrom = addDays(today(), -(RANGES[RANGES.length - 1] - 1))

  useEffect(() => {
    if (!ready) return
    let live = true
    void sync.fetchUsage(readFrom).then(docs => live && setRemote({ from: readFrom, docs }))
    return () => {
      live = false
    }
  }, [ready, readFrom, refresh, sync])

  const from = addDays(today(), -(range - 1))
  // The cloud's copy, then this device's own days on top (they may be newer than the last push).
  const merged = new Map<string, UsageDay>()
  const fetched = remote?.from === readFrom ? remote.docs : null
  for (const d of fetched ?? []) if (d.deviceId !== deviceId()) merged.set(d.id, d)
  for (const d of local) merged.set(d.id, d)
  const inRange = [...merged.values()].filter(d => d.date >= from && d.date <= today())
  const flagged = tablet || inRange.some(d => d.frankie)
  const frankieOnly = scope === 'frankie' && flagged
  const docs = frankieOnly ? inRange.filter(d => d.frankie) : inRange
  const cloudFailed = ready && remote?.from === readFrom && remote.docs === null

  const dates = Array.from({ length: range }, (_, i) => addDays(from, i))
  const perDay = dates.map(date => {
    const day = docs.filter(d => d.date === date)
    return { date, taps: sum(day.map(taps)), minutes: sum(day.map(d => d.minutes)) }
  })
  const parts = new Map<string, number>()
  for (const d of docs) for (const [k, n] of Object.entries(d.counts)) parts.set(k, (parts.get(k) ?? 0) + n)
  const byPart = [...parts.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
  const label = (k: string) => USAGE_LABELS[k as keyof typeof USAGE_LABELS] ?? k.replace(/_/g, ' ')
  const devices = new Map<string, { label: string; taps: number; minutes: number }>()
  // Oldest first, so the most recent day's name wins (the family may have renamed it).
  for (const d of [...docs].sort((a, b) => a.date.localeCompare(b.date))) {
    const cur = devices.get(d.deviceId) ?? { label: d.deviceLabel, taps: 0, minutes: 0 }
    devices.set(d.deviceId, { label: d.deviceLabel || cur.label, taps: cur.taps + taps(d), minutes: cur.minutes + d.minutes })
  }
  const daysUsed = perDay.filter(d => d.taps || d.minutes).length
  const maxPart = byPart[0]?.[1] ?? 0
  const maxDay = Math.max(1, ...perDay.map(d => d.taps))
  const empty = !byPart.length && !perDay.some(d => d.minutes)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Choice value={range} options={RANGES.map(r => [r, `${r} days`])} onChange={setRange} />
        <Choice
          value={frankieOnly ? 'frankie' : 'all'}
          options={[
            ['frankie', "Frankie's tablet"],
            ['all', 'All devices'],
          ]}
          onChange={setScope}
          disabled={flagged ? [] : ['frankie']}
        />
        {ready && (
          <BigButton size="sm" variant="quiet" onClick={() => setRefresh(n => n + 1)} aria-label="Refresh">
            <RefreshCw size={28} strokeWidth={2.5} />
          </BigButton>
        )}
      </div>
      <p className="text-lg text-ink-soft">
        Counts everything done outside Family mode on each device (never what was written or picked).
        {!flagged && ' No device is marked as Frankie’s tablet yet, so this shows all devices: mark Frankie’s tablet in This device.'}
        {!sync.enabled && ' Cloud sync is off, so this is this device only.'}
      </p>
      {cloudFailed && <p className="text-xl font-extrabold">This device only (the other devices’ counts couldn’t be read).</p>}

      {empty ? (
        <p className="text-2xl font-bold text-ink-soft">Nothing yet</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={daysUsed} word={`of ${range} days used`} />
            <Stat value={sum(docs.map(d => d.sessions))} word="sessions" />
            <Stat value={sum(perDay.map(d => d.minutes))} word="active minutes" />
            <Stat value={byPart[0] ? label(byPart[0][0]) : '—'} word="most used" />
          </div>

          <section className="flex flex-col gap-2" aria-label="By part">
            <h4 className="text-2xl font-extrabold">By part</h4>
            <ul className="flex flex-col gap-1.5">
              {byPart.map(([k, n]) => (
                <li key={k} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 sm:grid-cols-[14rem_1fr_auto]" title={`${label(k)}: ${n}`}>
                  <span className="truncate text-lg font-bold">{label(k)}</span>
                  <span className="h-4 rounded-r bg-soft">
                    <span className="block h-full rounded-r bg-orange-dark" style={{ width: `${Math.max(2, (n / maxPart) * 100)}%` }} />
                  </span>
                  <span className="min-w-[2.5ch] text-right text-lg font-extrabold">{n}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2" aria-label="By day">
            <h4 className="text-2xl font-extrabold">By day</h4>
            <div className="flex h-32 items-end gap-[2px] border-b-2 border-ink-soft">
              {perDay.map(d => (
                <span
                  key={d.date}
                  className="flex h-full min-w-0 flex-1 items-end"
                  title={`${DAY_SHORT[weekdayIndex(d.date)]} ${dayNumber(d.date)} ${monthName(d.date)}: ${plural(d.taps, 'use')}, ${plural(d.minutes, 'minute')}`}
                >
                  <span className="block w-full rounded-t bg-orange-dark" style={{ height: d.taps ? `${Math.max(3, (d.taps / maxDay) * 100)}%` : 0 }} />
                </span>
              ))}
            </div>
            <div className="flex gap-[2px]">
              {perDay.map(d => {
                // 30 days: a label under each Monday only (and the first day), so the numbers don't crowd.
                const show = range === 7 || weekdayIndex(d.date) === 0 || d.date === from
                return (
                  <span key={d.date} className="flex min-w-0 flex-1 flex-col items-center overflow-visible whitespace-nowrap text-center leading-tight">
                    {show && <span className="text-base font-extrabold">{range === 7 ? DAY_SHORT[weekdayIndex(d.date)].slice(0, 1) : dayNumber(d.date)}</span>}
                    {range === 7 && <span className="text-base text-ink-soft">{d.minutes}m</span>}
                  </span>
                )
              })}
            </div>
            <p className="text-lg text-ink-soft">Bars: uses each day.{range === 7 ? ' Under them: active minutes.' : ' Numbers mark each Monday.'}</p>
          </section>

          {!frankieOnly && devices.size > 0 && (
            <section className="flex flex-col gap-2" aria-label="By device">
              <h4 className="text-2xl font-extrabold">By device</h4>
              {[...devices.entries()]
                .sort((a, b) => b[1].taps - a[1].taps)
                .map(([id, d]) => (
                  <div key={id} className="flex items-center gap-3 text-lg">
                    <span className="min-w-0 flex-1 truncate font-bold">{d.label}</span>
                    <span className="font-extrabold">{plural(d.taps, 'use')}</span>
                    <span className="text-ink-soft">{plural(d.minutes, 'minute')}</span>
                  </div>
                ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
