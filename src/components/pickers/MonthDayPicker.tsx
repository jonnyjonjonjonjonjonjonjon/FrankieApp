import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { isMonthDay, MONTH_DAYS, MONTH_NAMES } from '../../lib/dates'
import { BigButton } from '../ui/BigButton'
import { Sheet } from '../ui/Sheet'
import { ClearButton, NoButton, YesButton } from '../ui/YesNo'

const pad = (n: number) => String(n).padStart(2, '0')

interface Props {
  title: string
  symbol?: string
  /** "MM-DD", or null to start from the month list. */
  value: string | null
  birthYear?: number | null
  /** Offer Clear (takes the birthday away). */
  allowNone?: boolean
  onDone: (value: { md: string; birthYear: number | null } | null) => void
  onBack: () => void
}

/**
 * A day in the year (a birthday): tap the month, then the day. The optional
 * year of birth is for the family (it shows her the age on the day).
 */
export function MonthDayPicker({ title, symbol = '🎂', value, birthYear = null, allowNone, onDone, onBack }: Props) {
  const init = isMonthDay(value) ? value.split('-').map(Number) : null
  const [month, setMonth] = useState<number | null>(init ? init[0] : null)
  const [day, setDay] = useState<number | null>(init ? init[1] : null)
  const [yearText, setYearText] = useState(birthYear ? String(birthYear) : '')

  const yearNum = Number(yearText)
  const yearOk = yearText === '' || (yearText.length === 4 && yearNum >= 1900 && yearNum <= new Date().getFullYear())
  // The day must exist in the month (a 31st moved to April is not a date: it would never show).
  const ready = month !== null && day !== null && day <= MONTH_DAYS[month - 1] && yearOk

  return (
    <Sheet
      title={title}
      symbol={symbol}
      onBack={onBack}
      hideBack
      footer={
        <>
          {allowNone && <ClearButton onClick={() => onDone(null)} />}
          <NoButton onClick={onBack} />
          <YesButton
            disabled={!ready}
            onClick={() => ready && onDone({ md: `${pad(month)}-${pad(day)}`, birthYear: yearText ? yearNum : null })}
          />
        </>
      }
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        {month === null ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4" role="group" aria-label="Month">
            {MONTH_NAMES.map((name, i) => (
              <BigButton
                key={name}
                size="lg"
                aria-label={name}
                onClick={() => {
                  setMonth(i + 1)
                  // Keep the day only if this month has it.
                  setDay(d => (d !== null && d > MONTH_DAYS[i] ? null : d))
                }}
              >
                <span className="text-2xl font-extrabold sm:hidden">{name.slice(0, 3)}</span>
                <span className="hidden text-2xl font-extrabold sm:inline">{name}</span>
              </BigButton>
            ))}
          </div>
        ) : (
          <>
            {/* The month name leads back to the month list */}
            <BigButton size="lg" className="self-start" onClick={() => setMonth(null)} aria-label="Change month">
              <ChevronLeft size={40} strokeWidth={3} />
              <span className="text-3xl font-extrabold">{MONTH_NAMES[month - 1]}</span>
            </BigButton>
            <div className="grid grid-cols-7 gap-2" role="radiogroup" aria-label="Day">
              {Array.from({ length: MONTH_DAYS[month - 1] }, (_, i) => i + 1).map(d => {
                const on = d === day
                return (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setDay(d)}
                    className={`flex h-16 items-center sm:h-20 justify-center rounded-2xl border-4 active:scale-95 ${
                      on ? 'border-orange-dark bg-orange' : 'border-ink bg-paper'
                    }`}
                  >
                    <span className={`text-2xl font-extrabold tabular-nums sm:text-3xl ${on ? 'text-white' : ''}`}>{d}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <label className="flex flex-wrap items-center gap-3 rounded-3xl border-4 border-line p-3">
          <span className="text-2xl font-extrabold">Year born</span>
          <input
            value={yearText}
            onChange={e => setYearText(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            placeholder="optional"
            autoComplete="off"
            aria-invalid={!yearOk}
            // The placeholder is smaller, so "optional" fits the box made for four digits.
            className={`min-h-16 w-40 rounded-2xl placeholder:text-xl placeholder:font-bold border-4 px-3 text-3xl font-extrabold tabular-nums outline-none focus:border-orange ${
              yearOk ? 'border-line' : 'border-orange-dark'
            }`}
          />
        </label>
      </div>
    </Sheet>
  )
}
