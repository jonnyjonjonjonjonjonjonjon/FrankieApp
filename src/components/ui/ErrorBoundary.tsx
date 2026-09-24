import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RotateCw } from 'lucide-react'
import { BigButton } from './BigButton'
import { Symbol } from './Symbol'

const RELOAD_KEY = 'frankies-diary-crash-reload'
/** A second crash this soon after the last automatic reload stops the reloading. */
const LOOP_MS = 60_000
/** How long to wait for the service worker to look for a newer version before reloading. */
const UPDATE_WAIT_MS = 4000
/** While stuck, keep looking for a newer version (a fix may be published). */
const RETRY_MS = 5 * 60_000

async function askForUpdate() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    await reg?.update()
  } catch {
    // offline, or no service worker: reloading is still worth a try
  }
}

function reloadedRecently(): boolean {
  try {
    const at = Number(sessionStorage.getItem(RELOAD_KEY))
    return at > 0 && Date.now() - at < LOOP_MS
  } catch {
    return false
  }
}

/** Note the automatic reload; false if it can't be noted (then don't reload, or it could loop). */
function noteReload(): boolean {
  try {
    const at = String(Date.now())
    sessionStorage.setItem(RELOAD_KEY, at)
    return sessionStorage.getItem(RELOAD_KEY) === at
  } catch {
    return false
  }
}

interface State {
  failed: boolean
  stuck: boolean
}

/**
 * Last line of defence against a white screen (e.g. data written by a newer
 * copy of the app on another device). Shows the same book as the loading
 * screen, so Frankie sees nothing alarming, asks for an app update and
 * reloads once. If it crashes again straight away it stays on the book, keeps
 * looking for an update, and offers family an "Again" button.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, stuck: false }
  private retry: ReturnType<typeof setInterval> | null = null

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('The diary crashed', error, info.componentStack)
    if (this.retry || this.state.stuck) return
    if (reloadedRecently() || !noteReload()) {
      this.setState({ stuck: true })
      this.retry = setInterval(() => void askForUpdate(), RETRY_MS)
      return
    }
    const wait = new Promise(resolve => setTimeout(resolve, UPDATE_WAIT_MS))
    void Promise.race([askForUpdate(), wait]).then(() => location.reload())
  }

  componentWillUnmount() {
    if (this.retry) clearInterval(this.retry)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-8 bg-paper">
        <Symbol symbol="📖" size="text-8xl" />
        {this.state.stuck && (
          <BigButton size="sm" onClick={() => location.reload()} aria-label="Try again">
            <RotateCw size={28} strokeWidth={2.5} />
            <span className="text-lg">Again</span>
          </BigButton>
        )}
      </div>
    )
  }
}
