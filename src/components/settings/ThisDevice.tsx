import { useState } from 'react'
import { Tablet } from 'lucide-react'
import { CHARGE_AT, CHARGER_PHOTO_ID, defaultDeviceLabel, deviceLabel, isFrankiesTablet, setDeviceLabel, setFrankiesTablet } from '../../lib/device'
import { putBlob, deleteBlob } from '../../lib/db'
import { forgetUrl, primeUrl, shrinkImage } from '../../lib/images'
import { useBattery } from '../../lib/useBattery'
import { BigButton } from '../ui/BigButton'
import { usePhotoUrl } from '../ui/usePhotoUrl'
import { PhotoInput } from '../pickers/PhotoInput'

/** Settings that live on this device only (never synced). */
export function ThisDevice() {
  const [tablet, setTablet] = useState(isFrankiesTablet())
  // The family's own name for this device (blank = the guess, shown as the placeholder).
  const [label, setLabel] = useState(() => (deviceLabel() === defaultDeviceLabel() ? '' : deviceLabel()))
  const [photoKey, setPhotoKey] = useState(0)
  const battery = useBattery()
  const photo = usePhotoUrl(photoKey >= 0 ? CHARGER_PHOTO_ID : null)

  const pickPhoto = async (file: File) => {
    const small = await shrinkImage(file)
    await putBlob(CHARGER_PHOTO_ID, small, true)
    primeUrl(CHARGER_PHOTO_ID, small)
    setPhotoKey(k => k + 1)
  }
  const removePhoto = async () => {
    await deleteBlob(CHARGER_PHOTO_ID)
    forgetUrl(CHARGER_PHOTO_ID)
    setPhotoKey(k => k + 1)
  }

  return (
    <div className="flex flex-col gap-3">
      <BigButton
        variant={tablet ? 'primary' : 'secondary'}
        aria-pressed={tablet}
        className="self-start"
        onClick={() => {
          setFrankiesTablet(!tablet)
          setTablet(!tablet)
        }}
      >
        <Tablet size={32} strokeWidth={2.5} />
        This is Frankie's tablet
      </BigButton>
      <p className="text-lg text-ink-soft">
        On Frankie's tablet the diary shows a big "Charge" screen when the battery falls to {Math.round(CHARGE_AT * 100)}% and it isn't plugged in.
        Family phones never show it.
        {battery.supported
          ? ` This device: ${Math.round(battery.level * 100)}%${battery.charging ? ', charging' : ''}.`
          : ' This browser cannot read the battery.'}
      </p>
      <label className="flex flex-wrap items-center gap-3">
        <span className="text-xl font-extrabold">Device name</span>
        <input
          value={label}
          onChange={e => {
            setLabel(e.target.value)
            setDeviceLabel(e.target.value)
          }}
          placeholder={defaultDeviceLabel()}
          autoComplete="off"
          className="min-h-14 min-w-0 flex-1 rounded-2xl border-4 border-line px-3 text-xl font-bold outline-none focus:border-orange"
        />
      </label>
      <p className="text-lg text-ink-soft">Names this device in Frankie's use.</p>
      <div className="flex flex-wrap items-center gap-3">
        {photo && <img src={photo} alt="Charger" className="h-24 w-24 rounded-2xl border-4 border-line object-cover" />}
        <PhotoInput size="sm" onPick={f => void pickPhoto(f)} />
        {photo && (
          <BigButton size="sm" onClick={() => void removePhoto()}>
            Remove photo
          </BigButton>
        )}
        <span className="text-lg text-ink-soft">Photo of her charger, shown on the Charge screen.</span>
      </div>
    </div>
  )
}
