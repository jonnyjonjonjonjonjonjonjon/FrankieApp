import { useLayoutEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { minutesOf, to12, toHHMM } from '../../lib/time'
import type { HHMM } from '../../types'
import { AnalogueFace } from '../ui/AnalogueFace'
import { BigButton } from '../ui/BigButton'
import { Sheet } from '../ui/Sheet'
import { TimeLabel } from '../ui/TimeLabel'

interface Props {
  title?: string
  value: HHMM
  /** Family/carer mode may enter other minutes (PRD §4.4). */
  fineMinutes?: boolean
  /** Offer a "No time" button that hands back null. */
  allowNone?: boolean
  onDone: (t: HHMM | null) => void
  onBack: () => void
}

/** Every hour and half hour of the day, 12:00 am → 11:30 pm. */
const SLOTS: HHMM[] = Array.from({ length: 48 }, (_, i) => toHHMM(Math.floor(i / 2), (i % 2) * 30))

/**
 * When? — one scrolling list of times, on the hour and half hour. Each row is
 * the time with am/pm and its sun/moon, plus a small clock face. Opens scrolled
 * to the current choice; one tap picks. Family mode can also type any minute.
 */
export function TimePicker({ title = 'When?', value, fineMinutes = false, allowNone = false, onDone, onBack }: Props) {
  const list = useRef<HTMLDivElement>(null)
  const [other, setOther] = useState(value)
  const onSlot = SLOTS.includes(value)

  // Centre the chosen (or nearest) time before the sheet is painted.
  useLayoutEffect(() => {
    const target = onSlot ? value : SLOTS.reduce((a, b) => (Math.abs(minutesOf(b) - minutesOf(value)) < Math.abs(minutesOf(a) - minutesOf(value)) ? b : a))
    list.current?.querySelector<HTMLElement>(`[data-time="${target}"]`)?.scrollIntoView({ block: 'center' })
  }, [value, onSlot])

  return (
    <Sheet
      title={title}
      symbol="🕒"
      onBack={onBack}
      footer={
        allowNone ? (
          <BigButton size="lg" onClick={() => onDone(null)}>
            No time
          </BigButton>
        ) : undefined
      }
    >
      <div ref={list} className="mx-auto flex max-w-2xl flex-col gap-2" role="listbox" aria-label={title}>
        {SLOTS.map(t => {
          const t12 = to12(t)
          const selected = t === value
          return (
            <button
              key={t}
              type="button"
              role="option"
              aria-selected={selected}
              data-time={t}
              onClick={() => onDone(t)}
              className={`flex min-h-20 items-center justify-between gap-4 rounded-2xl border-4 px-5 py-2 text-left active:scale-[0.98] ${
                selected ? 'border-orange-dark bg-orange-light' : 'border-ink bg-paper'
              }`}
            >
              <TimeLabel time={t} size="lg" />
              <span className="flex items-center gap-3">
                {selected && <Check size={36} strokeWidth={3.5} className="text-orange-dark" />}
                <AnalogueFace hour={t12.hour} minute={t12.minute} size={56} />
              </span>
            </button>
          )
        })}

        {fineMinutes && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border-4 border-line p-3">
            <label className="text-xl font-bold" htmlFor="other-time">
              Other time
            </label>
            <input
              id="other-time"
              type="time"
              value={other}
              onChange={e => setOther(e.target.value)}
              className="min-h-14 rounded-xl border-4 border-line px-3 text-2xl font-bold"
            />
            <BigButton size="sm" variant="green" onClick={() => other && onDone(other)}>
              <Check size={28} strokeWidth={3} /> Use
            </BigButton>
          </div>
        )}
      </div>
    </Sheet>
  )
}
