import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { blockPinchZoom } from './lib/noZoom'
import { startUsage } from './lib/usage'

blockPinchZoom()
// Count which parts of the diary are used (Family settings → Frankie's use).
void startUsage()

// Installable app: swap to a newly published version as soon as it is ready
// (the page reloads itself), and check for one every hour while left open.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    setInterval(() => void registration.update(), 60 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
