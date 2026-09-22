import { useEffect, useState } from 'react'
import { sync } from './sync'

export function useSync() {
  const [, bump] = useState(0)
  useEffect(() => sync.subscribe(() => bump(n => n + 1)), [])
  return sync
}
