import { useState } from 'react'
import { Check, Moon, Sun } from 'lucide-react'
import { from12, to12 } from '../../lib/time'
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
  onDone: (t: HHMM) => void
  onBack: () => void
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/** When? — whole and half hours only, 12-hour, am/pm as sun/moon buttons, analogue echo. */
export function TimePicker({ title = 'When?', value, fineMinutes = false, onDone, onBack }: Props) {
  const init = to12(value)
  const [hour, setHour] = useState(init.hour)
  const [minute, setMinute] = useState(init.minute)
  const [ampm, setAmpm] = useState<'am' | 'pm'>(init.ampm)
  const result = from12(hour, minute, ampm)
  const minutes = fineMinutes ? [0, 15, 30, 45] : [0, 30]

  return (
    <Sheet
      title={title}
      symbol="🕒"
      onBack={onBack}
      footer={
        <BigButton variant="green" size="lg" onClick={() => onDone(result)}>
          <Check size={44} strokeWidth={3.5} />
          Done
        </BigButton>
      }
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <div className="flex items-center justify-center gap-6 rounded-3xl border-4 border-line bg-soft px-4 py-3">
          <TimeLabel time={result} size="xl" />
          <AnalogueFace hour={hour} minute={minute} size={110} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <BigButton size="lg" variant={ampm === 'am' ? 'primary' : 'secondary'} onClick={() => setAmpm('am')}>
            <Sun size={48} strokeWidth={2.5} />
            am
          </BigButton>
          <BigButton size="lg" variant={ampm === 'pm' ? 'primary' : 'secondary'} onClick={() => setAmpm('pm')}>
            <Moon size={48} strokeWidth={2.5} />
            pm
          </BigButton>
        </div>

        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {HOURS.map(h => (
            <BigButton key={h} size="lg" variant={hour === h ? 'primary' : 'secondary'} onClick={() => setHour(h)}>
              {h}
            </BigButton>
          ))}
        </div>

        <div className={`grid gap-3 ${fineMinutes ? 'grid-cols-4' : 'grid-cols-2'}`}>
          {minutes.map(m => (
            <BigButton key={m} size="lg" variant={minute === m ? 'primary' : 'secondary'} onClick={() => setMinute(m)}>
              :{String(m).padStart(2, '0')}
            </BigButton>
          ))}
        </div>

        {fineMinutes && (
          <label className="flex items-center gap-3 text-xl font-bold">
            Other minutes
            <input
              type="number"
              min={0}
              max={59}
              value={minute}
              onChange={e => setMinute(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
              className="min-h-16 w-28 rounded-2xl border-4 border-line px-3 text-2xl font-bold"
            />
          </label>
        )}
      </div>
    </Sheet>
  )
}
