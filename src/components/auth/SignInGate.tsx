import type { ReactNode } from 'react'
import { LogIn, LogOut, RefreshCw } from 'lucide-react'
import { useSync } from '../../lib/useSync'
import { BigButton } from '../ui/BigButton'
import { Symbol } from '../ui/Symbol'

/**
 * When cloud sync is configured, everyone signs in with Google once and the
 * device then stays signed in. Frankie never sees this again after setup.
 */
export function SignInGate({ children }: { children: ReactNode }) {
  const sync = useSync()

  if (sync.status === 'off' || sync.status === 'ready') return <>{children}</>

  if (sync.status === 'starting') {
    return (
      <div className="flex h-dvh items-center justify-center bg-paper">
        <Symbol symbol="📖" size="text-8xl" />
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-6 bg-paper px-6 text-center">
      <Symbol symbol="📖" size="text-9xl" />
      <h1 className="text-4xl font-extrabold">Frankie's Diary</h1>
      {sync.status === 'signed-out' ? (
        <>
          <p className="max-w-md text-2xl font-bold text-ink-soft">Sign in once with your Google account. This device then stays signed in.</p>
          <BigButton variant="primary" size="lg" onClick={() => void sync.signIn()}>
            <LogIn size={44} strokeWidth={3} />
            Sign in with Google
          </BigButton>
        </>
      ) : (
        <>
          <p className="max-w-md text-2xl font-bold text-ink-soft">
            <span className="text-ink">{sync.user?.email}</span> is not on the family list yet. Ask Jon to add it, then try again.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <BigButton variant="primary" size="lg" onClick={() => void sync.checkMembership()}>
              <RefreshCw size={40} strokeWidth={3} />
              Try again
            </BigButton>
            <BigButton size="lg" onClick={() => void sync.signOut()}>
              <LogOut size={40} strokeWidth={3} />
              Sign out
            </BigButton>
          </div>
        </>
      )}
      {sync.lastError && <p className="max-w-lg text-base text-ink-soft">{sync.lastError}</p>}
    </div>
  )
}
