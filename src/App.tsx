import { useRef, useState, type ReactNode } from 'react'
import { useStore } from './lib/store'
import type { View } from './types'
import { StoreProvider } from './lib/StoreProvider'
import { Symbol } from './components/ui/Symbol'
import { SignInGate } from './components/auth/SignInGate'
import { DayView } from './components/day/DayView'
import { GalleryView } from './components/photos/GalleryView'
import { MonthView } from './components/month/MonthView'
import { SettingsView } from './components/settings/SettingsView'
import { TabBar } from './components/ui/TabBar'
import { Toast } from './components/ui/Toast'
import { ChargePrompt } from './components/ui/ChargePrompt'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { useLeaveGhost } from './components/ui/useLeaveGhost'
import { today } from './lib/dates'
import { WeekView } from './components/week/WeekView'

/** Tab order, so a new view slides in from the side its tab is on. */
const TAB_ORDER = { today: 0, week: 1, month: 2, photos: 3, settings: 4 }

/** Which screen a view is, and where it sits: the Today tab's day counts as Today, a day opened from the week or month is just past it. */
function place(view: View): { key: string; order: number } {
  if (view.kind === 'day') {
    if (view.from === 'today') return { key: 'today', order: 0 }
    return { key: `day-${view.from}`, order: (view.from === 'week' ? 1 : view.from === 'month' ? 2 : 0) + 0.5 }
  }
  return { key: view.kind, order: TAB_ORDER[view.kind] }
}

/** The current view, sliding in whenever it changes. */
function Views() {
  const store = useStore()
  const now = store.state.loading ? null : place(store.state.view)
  const key = now?.key ?? 'loading'
  // Direction from the previous screen (state set during render: React's pattern for "previous value").
  const [shown, setShown] = useState<{ key: string; order: number; slide: string }>({ key, order: now?.order ?? 0, slide: '' })
  if (shown.key !== key) {
    // Out of the loading book: a fade. Between screens: a slide.
    const slide = !now ? '' : shown.key === 'loading' ? 'fade-in' : now.order >= shown.order ? 'from-right' : 'from-left'
    setShown({ key, order: now?.order ?? 0, slide })
  }
  return (
    <ViewFrame key={key} slide={shown.key === key ? shown.slide : ''} leaves={key !== 'loading'}>
      <Screen />
    </ViewFrame>
  )
}

/** Which way a view leaves, given how its replacement arrived. */
const LEAVE: Record<string, string> = { 'from-right': 'to-left', 'from-left': 'to-right', 'fade-in': 'fade-out' }

/** One view: slides in, and when it's replaced, slides out the other way while the new one comes in. */
function ViewFrame({ slide, leaves, children }: { slide: string; leaves: boolean; children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null)
  useLeaveGhost(frame, () => (leaves ? (LEAVE[document.querySelector<HTMLElement>('[data-view-frame]')?.dataset.slide ?? ''] ?? '') : ''), { zIndex: 5 })
  return (
    <div ref={frame} data-view-frame data-slide={slide} className={`h-full ${slide}`}>
      {children}
    </div>
  )
}

function Screen() {
  const store = useStore()
  const { view, loading } = store.state
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Symbol symbol="📖" size="text-8xl" />
      </div>
    )
  }
  switch (view.kind) {
    case 'today':
      return <DayView date={today()} from="today" />
    case 'week':
      return <WeekView date={view.date} />
    case 'month':
      return <MonthView date={view.date} />
    case 'day':
      return <DayView date={view.date} from={view.from} />
    case 'photos':
      return <GalleryView />
    case 'settings':
      return <SettingsView />
  }
}

export default function App() {
  return (
    <StoreProvider>
      <ErrorBoundary>
        <SignInGate>
          <div className="flex h-dvh flex-col bg-paper">
            <main className="min-h-0 flex-1 overflow-clip">
              <Views />
            </main>
            <TabBar />
          </div>
          <Toast />
          <ChargePrompt />
        </SignInGate>
      </ErrorBoundary>
    </StoreProvider>
  )
}
