import { useEffect, type ReactNode } from 'react'
import { store, StoreContext } from './store'

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void store.load()
  }, [])
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
