import { nowHHMM, to12 } from '../../lib/time'
import { AnalogueFace } from './AnalogueFace'
import { TimeLabel } from './TimeLabel'
import { useNow } from './useNow'

/** Large digital 12-hour clock with am/pm + sun/moon and a small analogue face (PRD §4.1). */
export function Clock() {
  const now = useNow()
  const hhmm = nowHHMM(now)
  const t = to12(hhmm)
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-3xl border-4 border-line bg-soft px-4 py-3">
      <TimeLabel time={hhmm} size="xl" />
      <AnalogueFace hour={t.hour} minute={t.minute} size={110} className="h-20 w-20 sm:h-28 sm:w-28" />
    </div>
  )
}
