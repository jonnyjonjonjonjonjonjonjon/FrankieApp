import { useEffect, type ReactNode } from 'react'
import { store, StoreContext } from './store'
import { sync } from './sync'

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void store.load().then(() => sync.start())
  }, [])
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
