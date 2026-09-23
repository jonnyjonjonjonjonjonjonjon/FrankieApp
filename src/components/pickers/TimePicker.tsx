import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Moon, Sun } from 'lucide-react'
import { parseHHMM, to12, toHHMM } from '../../lib/time'
import type { HHMM } from '../../types'
import { AnalogueFace } from '../ui/AnalogueFace'
import { BigButton } from '../ui/BigButton'
import { Sheet } from '../ui/Sheet'
import { TimeLabel } from '../ui/TimeLabel'

interface Props {
  title?: string
  value: HHMM
  /** Offer a "No time" button that hands back null. */
  allowNone?: boolean
  onDone: (t: HHMM | null) => void
  onBack: () => void
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

function HourLabel({ h }: { h: number }) {
  const t = to12(toHHMM(h, 0))
  const Icon = t.ampm === 'am' ? Sun : Moon
  return (
    <span className="inline-flex items-center gap-2 font-extrabold tabular-nums">
      <span className="text-4xl">{t.hour}</span>
      <span className="text-2xl font-bold">{t.ampm}</span>
      <Icon size={32} strokeWidth={2.5} className={t.ampm === 'am' ? 'text-orange' : 'text-ink-soft'} />
    </span>
  )
}

/**
 * When? — a clock at the top showing the time being chosen, then the hours
 * (one list), then the minutes in fives. Each tap updates the clock; Done
 * confirms.
 */
export function TimePicker({ title = 'When?', value, allowNone = false, onDone, onBack }: Props) {
  const init = parseHHMM(value)
  const [hour, setHour] = useState(init.h)
  const [minute, setMinute] = useState(Math.min(55, Math.round(init.m / 5) * 5))
  const [step, setStep] = useState<'hour' | 'minute'>('hour')
  const list = useRef<HTMLDivElement>(null)
  const result = toHHMM(hour, minute)
  const t12 = to12(result)

  // Open the hour list with the chosen hour in view.
  // (Scroll the list itself only; scrollIntoView would also scroll the page around it.)
  useLayoutEffect(() => {
    const el = list.current
    const row = el?.querySelector<HTMLElement>(`[data-hour="${hour}"]`)
    if (step === 'hour' && el && row) el.scrollTop = row.offsetTop - el.offsetTop - (el.clientHeight - row.offsetHeight) / 2
    // only when the step opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  return (
    <Sheet
      title={title}
      symbol="🕒"
      onBack={onBack}
      footer={
        <>
          {allowNone && (
            <BigButton size="lg" onClick={() => onDone(null)}>
              No time
            </BigButton>
          )}
          <BigButton variant="green" size="lg" onClick={() => onDone(result)}>
            <Check size={44} strokeWidth={3.5} />
            Done
          </BigButton>
        </>
      }
    >
      <div className="mx-auto flex h-full max-w-2xl flex-col gap-3">
        {/* The time being chosen: fixed above the list */}
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-6 gap-y-2 border-b-4 border-line pb-3">
          {step === 'minute' && (
            <BigButton onClick={() => setStep('hour')} aria-label="Change hour">
              <ArrowLeft size={32} strokeWidth={3} />
              <HourLabel h={hour} />
            </BigButton>
          )}
          <AnalogueFace hour={t12.hour} minute={t12.minute} size={180} className="h-28 w-28 sm:h-44 sm:w-44" />
          <TimeLabel time={result} size="xl" />
        </div>

        {step === 'hour' ? (
          <div ref={list} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto" role="listbox" aria-label="Hour">
            {HOURS.map(h => {
              const selected = h === hour
              return (
                <button
                  key={h}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-hour={h}
                  onClick={() => {
                    setHour(h)
                    setStep('minute')
                  }}
                  className={`flex min-h-20 items-center justify-between rounded-2xl border-4 px-5 py-2 active:scale-[0.98] ${
                    selected ? 'border-orange-dark bg-orange-light' : 'border-ink bg-paper'
                  }`}
                >
                  <HourLabel h={h} />
                  {selected && <Check size={36} strokeWidth={3.5} className="text-orange-dark" />}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6" role="listbox" aria-label="Minutes">
              {MINUTES.map(m => (
                <BigButton
                  key={m}
                  size="lg"
                  role="option"
                  aria-selected={m === minute}
                  variant={m === minute ? 'primary' : 'secondary'}
                  onClick={() => setMinute(m)}
                >
                  <span className="text-3xl font-extrabold tabular-nums">:{String(m).padStart(2, '0')}</span>
                </BigButton>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}
