import { MONTH_NAMES, today } from '../../lib/dates'
import type { ISODate } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Sheet } from '../ui/Sheet'

interface Props {
  current: ISODate
  onPick: (monthStart: ISODate) => void
  onBack: () => void
}

/** Jump straight to a month this year or next (PRD §4.3). */
export function YearPicker({ current, onPick, onBack }: Props) {
  const thisYear = Number(today().slice(0, 4))
  const years = [thisYear, thisYear + 1]
  return (
    <Sheet title="Which month?" symbol="📅" onBack={onBack}>
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {years.map(y => (
          <section key={y} className="flex flex-col gap-3">
            <h3 className="text-4xl font-extrabold">{y}</h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {MONTH_NAMES.map((name, i) => {
                const iso = `${y}-${String(i + 1).padStart(2, '0')}-01`
                const isCurrent = iso.slice(0, 7) === current.slice(0, 7)
                return (
                  <BigButton key={iso} size="lg" variant={isCurrent ? 'primary' : 'secondary'} onClick={() => onPick(iso)}>
                    {name}
                  </BigButton>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </Sheet>
  )
}
