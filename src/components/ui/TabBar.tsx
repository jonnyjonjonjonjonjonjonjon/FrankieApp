import { CalendarDays, CalendarRange, Image, Sun } from 'lucide-react'
import { today } from '../../lib/dates'
import { useStore } from '../../lib/store'
import type { Tab, View } from '../../types'

const TABS: { tab: Tab; word: string; Icon: typeof Sun; view: () => View }[] = [
  { tab: 'today', word: 'Today', Icon: Sun, view: () => ({ kind: 'today' }) },
  { tab: 'week', word: 'Week', Icon: CalendarRange, view: () => ({ kind: 'week', date: today() }) },
  { tab: 'month', word: 'Month', Icon: CalendarDays, view: () => ({ kind: 'month', date: today() }) },
  { tab: 'photos', word: 'Photos', Icon: Image, view: () => ({ kind: 'photos' }) },
]

function activeTab(view: View): Tab | null {
  if (view.kind === 'day') return view.from
  if (view.kind === 'settings') return null
  return view.kind
}

/** Persistent tab bar with word + icon (PRD §4.1). */
export function TabBar() {
  const store = useStore()
  const active = activeTab(store.state.view)
  return (
    <nav className="safe-bottom grid grid-cols-4 gap-2 border-t-4 border-line bg-paper px-2 pt-1.5 pb-1.5" aria-label="Main">
      {TABS.map(({ tab, word, Icon, view }) => {
        const on = active === tab
        return (
          <button
            key={tab}
            type="button"
            aria-current={on ? 'page' : undefined}
            onClick={() => store.go(view())}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border-4 text-base sm:min-h-20 sm:text-xl font-extrabold active:scale-95 ${
              on ? 'border-orange-dark bg-orange text-white' : 'border-ink bg-paper'
            }`}
          >
            <Icon size={36} strokeWidth={2.75} />
            {word}
          </button>
        )
      })}
    </nav>
  )
}
