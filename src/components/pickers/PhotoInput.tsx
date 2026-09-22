import { useRef } from 'react'
import { Camera, Image } from 'lucide-react'
import { BigButton } from '../ui/BigButton'

interface Props {
  onPick: (file: File) => void
  size?: 'sm' | 'md' | 'lg'
  cameraWord?: string
  galleryWord?: string
  className?: string
}

/** Camera + gallery buttons backed by hidden file inputs. */
export function PhotoInput({ onPick, size = 'md', cameraWord = 'Camera', galleryWord = 'Photos', className = '' }: Props) {
  const cam = useRef<HTMLInputElement>(null)
  const gal = useRef<HTMLInputElement>(null)
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onPick(f)
    e.target.value = ''
  }
  const icon = size === 'lg' ? 44 : size === 'sm' ? 28 : 34
  return (
    <div className={`flex gap-3 ${className}`}>
      <BigButton size={size} onClick={() => cam.current?.click()}>
        <Camera size={icon} strokeWidth={2.5} />
        {cameraWord}
      </BigButton>
      <BigButton size={size} onClick={() => gal.current?.click()}>
        <Image size={icon} strokeWidth={2.5} />
        {galleryWord}
      </BigButton>
      <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      <input ref={gal} type="file" accept="image/*" className="hidden" onChange={handle} />
    </div>
  )
}
