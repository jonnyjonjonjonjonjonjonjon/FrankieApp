/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Injected at build time from vite.config.ts. */
declare const __APP_VERSION__: string

/** Battery Status API (Chrome/Edge; not typed in lib.dom). */
interface BatteryManager extends EventTarget {
  readonly level: number
  readonly charging: boolean
}
interface Navigator {
  getBattery?: () => Promise<BatteryManager>
}
