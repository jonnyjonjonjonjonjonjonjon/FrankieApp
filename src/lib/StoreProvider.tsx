import { useEffect, type ReactNode } from 'react'
import { store, StoreContext } from './store'
import { sync } from './sync'

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // With sync on, migrations wait for the first cloud snapshot (sync calls store.syncedOnce()).
    void store.load({ migrate: !sync.enabled }).then(() => sync.start())
  }, [])
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
