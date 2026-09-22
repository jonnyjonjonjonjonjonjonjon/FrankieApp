import { Moon, Sun } from 'lucide-react'
import { to12 } from '../../lib/time'
import type { HHMM } from '../../types'

/** "5:30 pm" with the sun/moon icon always paired with am/pm. */
export function TimeLabel({ time, size = 'md', className = '' }: { time: HHMM; size?: 'md' | 'lg' | 'xl'; className?: string }) {
  const t = to12(time)
  const text = size === 'xl' ? 'text-3xl sm:text-5xl' : size === 'lg' ? 'text-2xl sm:text-4xl' : 'text-xl sm:text-2xl'
  const icon = size === 'xl' ? 44 : size === 'lg' ? 36 : 28
  const Icon = t.ampm === 'am' ? Sun : Moon
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tabular-nums ${text} ${className}`}>
      <span>{t.clock}</span>
      <span className="text-[0.7em] font-bold">{t.ampm}</span>
      <Icon size={icon} strokeWidth={2.5} className={t.ampm === 'am' ? 'text-orange' : 'text-ink-soft'} />
    </span>
  )
}
