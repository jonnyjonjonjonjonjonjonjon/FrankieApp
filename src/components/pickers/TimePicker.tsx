import { useEffect, useMemo, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { isDaytime, parseHHMM, to12, toHHMM } from '../../lib/time'
import type { HHMM } from '../../types'
import { AnalogueFace } from '../ui/AnalogueFace'
import { Sheet } from '../ui/Sheet'
import { TimeLabel } from '../ui/TimeLabel'
import { ClearButton, NoButton, YesButton } from '../ui/YesNo'
import { Wheel } from './Wheel'

interface Props {
  title?: string
  value: HHMM
  /** Offer a "Clear" button that hands back null (removes the time). */
  allowNone?: boolean
  onDone: (t: HHMM | null) => void
  onBack: () => void
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

function HourItem({ h }: { h: number }) {
  const t = to12(toHHMM(h, 0))
  const day = isDaytime(toHHMM(h, 0))
  const Icon = day ? Sun : Moon
  return (
    <span className="inline-flex items-center gap-2 font-extrabold tabular-nums">
      <span className="w-[2ch] text-right text-4xl">{t.hour}</span>
      <span className="text-2xl font-bold">{t.ampm}</span>
      <Icon size={30} strokeWidth={2.5} className={day ? 'text-orange' : 'text-ink-soft'} />
    </span>
  )
}

/**
 * When? — two scroll wheels, hours (with am/pm and sun/moon) and minutes in
 * fives, beside a clock that follows them. Yes confirms, No leaves it as it was.
 */
export function TimePicker({ title = 'When?', value, allowNone = false, onDone, onBack }: Props) {
  const [result, setResult] = useState<HHMM>(value)
  return (
    <Sheet
      title={title}
      symbol="🕒"
      onBack={onBack}
      hideBack
      footer={
        <>
          {allowNone && <ClearButton onClick={() => onDone(null)} />}
          <NoButton onClick={onBack} />
          <YesButton onClick={() => onDone(result)} />
        </>
      }
    >
      <TimeWheels value={value} onChange={setResult} />
    </Sheet>
  )
}

/** The clock, the time being chosen and the two wheels: the time picker's body, also used inline on a day row. */
export function TimeWheels({ value, onChange }: { value: HHMM; onChange: (t: HHMM) => void }) {
  const init = parseHHMM(value)
  const [hour, setHour] = useState(init.h)
  const [minuteIdx, setMinuteIdx] = useState(Math.min(11, Math.round(init.m / 5)))
  const result = toHHMM(hour, MINUTES[minuteIdx])
  const t12 = to12(result)
  useEffect(() => onChange(result), [result, onChange])
  // Stable item lists so the wheels don't re-render their rows mid-scroll.
  const hourItems = useMemo(() => HOURS.map(h => <HourItem key={h} h={h} />), [])
  const minuteItems = useMemo(
    () =>
      MINUTES.map(m => (
        <span key={m} className="text-4xl font-extrabold tabular-nums">
          :{String(m).padStart(2, '0')}
        </span>
      )),
    [],
  )

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4">
      {/* The time being chosen, above the wheels. Portrait screens stack
          the clock over the time and let it grow into the spare height. */}
      <div className="flex items-center gap-5 portrait:flex-col portrait:gap-2">
        <AnalogueFace
          hour={t12.hour}
          minute={t12.minute}
          size={180}
          className="h-36 w-36 sm:h-[9.5rem] sm:w-[9.5rem] portrait:h-[min(72vw,34vh)] portrait:w-[min(72vw,34vh)]"
        />
        {/* Sized to the widest time ("12:55 pm") so nothing shifts as digits change */}
        <div className="grid">
          <span className="invisible col-start-1 row-start-1" aria-hidden>
            <TimeLabel time="12:55" size="xl" />
          </span>
          <span className="col-start-1 row-start-1 flex justify-center">
            <TimeLabel time={result} size="xl" />
          </span>
        </div>
      </div>

      {/* The wheels */}
      <div className="grid w-full grid-cols-[3fr_2fr] gap-4">
        <Wheel label="Hour" items={hourItems} index={hour} onChange={setHour} />
        <Wheel label="Minutes" items={minuteItems} index={minuteIdx} onChange={setMinuteIdx} />
      </div>
    </div>
  )
}
