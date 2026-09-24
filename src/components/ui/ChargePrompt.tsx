import { useEffect, useState } from 'react'
import { BatteryLow, Plug } from 'lucide-react'
import { CHARGE_AT, CHARGER_PHOTO_ID, isFrankiesTablet } from '../../lib/device'
import { buzz } from '../../lib/haptics'
import { useBattery } from '../../lib/useBattery'
import { BigButton } from './BigButton'
import { Symbol } from './Symbol'
import { usePhotoUrl } from './usePhotoUrl'

const LATER_MS = 10 * 60 * 1000

/**
 * Frankie's tablet only: when the battery is low and not charging, a
 * full-screen "Charge" prompt that stays until the tablet is plugged in.
 * Vibration only, no sound (PRD §6).
 */
export function ChargePrompt() {
  const battery = useBattery()
  const photo = usePhotoUrl(CHARGER_PHOTO_ID)
  const [snoozed, setSnoozed] = useState(false)
  const show = isFrankiesTablet() && battery.supported && !battery.charging && battery.level <= CHARGE_AT && !snoozed

  useEffect(() => {
    if (show) buzz([80, 60, 80])
  }, [show])
  useEffect(() => {
    if (!snoozed) return
    const t = setTimeout(() => setSnoozed(false), LATER_MS)
    return () => clearTimeout(t)
  }, [snoozed])

  if (!show) return null
  const pct = Math.round(battery.level * 100)
  return (
    <div className="pop-in fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-paper px-6 text-center" role="alertdialog" aria-label="Charge">
      <div className="flex items-center gap-6">
        <BatteryLow size={120} strokeWidth={2.5} className="text-ink" />
        <Symbol symbol="🔌" size="text-9xl" />
      </div>
      <h1 className="text-6xl font-extrabold">Charge</h1>
      {photo && <img src={photo} alt="" className="max-h-[40vh] max-w-full rounded-3xl border-4 border-ink object-contain" />}
      <div className="flex items-center gap-3 rounded-2xl border-4 border-line bg-soft px-5 py-3 text-3xl font-extrabold">
        <Plug size={44} strokeWidth={2.5} />
        {pct}%
      </div>
      <BigButton size="sm" variant="ghost" onClick={() => setSnoozed(true)}>
        Later
      </BigButton>
    </div>
  )
}
