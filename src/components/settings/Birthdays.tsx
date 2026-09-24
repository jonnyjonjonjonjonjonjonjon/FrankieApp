import { useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { monthDayLabel, today } from '../../lib/dates'
import { useStore } from '../../lib/store'
import type { Id } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { ItemPicker } from '../pickers/ItemPicker'
import { MonthDayPicker } from '../pickers/MonthDayPicker'

type Step = null | { at: 'who' } | { at: 'date'; personId: Id }

const away = (days: number) => (days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days} days`)

/**
 * Family settings → Birthdays (backlog item 14): everyone's birthday, soonest
 * first, and a way to add one without hunting through the people list.
 * Birthdays live on the person, so they show in every view straight away.
 */
export function Birthdays() {
  const store = useStore()
  const [step, setStep] = useState<Step>(null)
  const list = store.upcomingBirthdays(today())
  const person = step?.at === 'date' ? store.state.items[step.personId] : null

  return (
    <>
      {list.length === 0 && <p className="text-xl text-ink-soft">No birthdays yet.</p>}
      {list.map(({ person: p, date, daysAway, age }) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setStep({ at: 'date', personId: p.id })}
          className="flex min-h-20 items-center gap-3 rounded-2xl border-4 border-line p-2 text-left active:bg-soft"
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-soft">
            {p.photoId ? <Photo id={p.photoId} alt={p.name} className="h-full w-full" /> : <Symbol symbol={p.symbol} size="text-5xl" />}
          </div>
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3">
            <span className="text-2xl font-extrabold">{p.name}</span>
            <span className="text-xl font-bold">{monthDayLabel(date.slice(5))}</span>
            <span className={`text-lg font-bold ${daysAway < 2 ? 'text-orange-dark' : 'text-ink-soft'}`}>
              {away(daysAway)}
              {age !== null && ` · turns ${age}`}
            </span>
          </span>
          <ChevronRight size={36} strokeWidth={3} className="shrink-0" />
        </button>
      ))}
      <BigButton variant="primary" className="self-start" onClick={() => setStep({ at: 'who' })}>
        <Plus size={36} strokeWidth={3} />
        <span className="text-white">Add birthday</span>
      </BigButton>

      {step?.at === 'who' && (
        <ItemPicker
          kind="person"
          title="Whose birthday?"
          symbol="🎂"
          onBack={() => setStep(null)}
          onDone={ids => setStep(ids[0] ? { at: 'date', personId: ids[0] } : null)}
        />
      )}
      {person && (
        <MonthDayPicker
          title={person.name}
          value={person.birthday ?? null}
          birthYear={person.birthYear ?? null}
          allowNone={Boolean(person.birthday)}
          onBack={() => setStep(null)}
          onDone={v => {
            void store.updateItem(person.id, v ? { birthday: v.md, birthYear: v.birthYear } : { birthday: null, birthYear: null })
            store.toast(v ? `${person.name}: ${monthDayLabel(v.md)}` : `${person.name}: no birthday`)
            setStep(null)
          }}
        />
      )}
    </>
  )
}
