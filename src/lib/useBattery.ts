import { useEffect, useState } from 'react'

export interface BatteryState {
  supported: boolean
  /** 0–1 */
  level: number
  charging: boolean
}

/** Battery level and charging state, live (Chrome/Edge; unsupported elsewhere). */
export function useBattery(): BatteryState {
  const [state, setState] = useState<BatteryState>({ supported: false, level: 1, charging: true })
  useEffect(() => {
    if (!navigator.getBattery) return
    let alive = true
    let battery: BatteryManager | null = null
    const read = () => {
      if (alive && battery) setState({ supported: true, level: battery.level, charging: battery.charging })
    }
    void navigator.getBattery().then(b => {
      battery = b
      read()
      b.addEventListener('levelchange', read)
      b.addEventListener('chargingchange', read)
    })
    const timer = setInterval(read, 60_000)
    return () => {
      alive = false
      clearInterval(timer)
      battery?.removeEventListener('levelchange', read)
      battery?.removeEventListener('chargingchange', read)
    }
  }, [])
  return state
}
