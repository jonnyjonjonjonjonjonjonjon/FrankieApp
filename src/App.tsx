import { useStore } from './lib/store'
import { StoreProvider } from './lib/StoreProvider'
import { SignInGate } from './components/auth/SignInGate'
import { DayView } from './components/day/DayView'
import { GalleryView } from './components/photos/GalleryView'
import { MonthView } from './components/month/MonthView'
import { SettingsView } from './components/settings/SettingsView'
import { TabBar } from './components/ui/TabBar'
import { Toast } from './components/ui/Toast'
import { today } from './lib/dates'
import { WeekView } from './components/week/WeekView'

function Screen() {
  const store = useStore()
  const { view, loading } = store.state
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="symbol text-8xl">📖</span>
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
      <SignInGate>
        <div className="flex h-dvh flex-col bg-paper">
          <main className="min-h-0 flex-1">
            <Screen />
          </main>
          <TabBar />
        </div>
        <Toast />
      </SignInGate>
    </StoreProvider>
  )
}
