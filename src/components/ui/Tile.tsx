import { Camera } from 'lucide-react'
import { Photo } from './Photo'
import { Symbol } from './Symbol'

interface Props {
  word: string
  symbol: string
  photoId?: string | null
  showPhoto?: boolean
  /** Tap on the symbol area flips symbol ↔ photo (PRD §4.5). */
  onFlip?: () => void
  onSelect?: () => void
  selected?: boolean
  size?: 'md' | 'lg'
  /** Rendered as the orange "+ Add" tile. */
  accent?: boolean
  subline?: string
  className?: string
}

/**
 * Word + symbol tile. The word is large, the symbol beneath it; if the item has
 * a photo a small camera badge shows on the symbol and tapping the symbol flips it.
 */
export function Tile({
  word,
  symbol,
  photoId,
  showPhoto,
  onFlip,
  onSelect,
  selected,
  size = 'md',
  accent,
  subline,
  className = '',
}: Props) {
  const hasPhoto = Boolean(photoId)
  const showingPhoto = hasPhoto && showPhoto
  const box = size === 'lg' ? 'h-40 w-40' : 'h-28 w-28'
  const symbolSize = size === 'lg' ? 'text-8xl' : 'text-7xl'

  const border = selected
    ? 'border-orange ring-4 ring-orange-light'
    : accent
      ? 'border-orange-dark bg-orange text-white'
      : 'border-ink bg-paper'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.()
        }
      }}
      className={`flex min-h-[7.5rem] flex-col items-center gap-2 rounded-3xl border-4 p-3 text-center transition-transform active:scale-95 ${border} ${className}`}
    >
      <span className={`font-extrabold leading-tight ${size === 'lg' ? 'text-3xl' : 'text-2xl'}`}>{word}</span>
      <div
        className={`relative flex ${box} shrink-0 items-center justify-center overflow-hidden rounded-2xl ${accent ? '' : 'bg-soft'}`}
        onClick={e => {
          if (hasPhoto && onFlip) {
            e.stopPropagation()
            onFlip()
          }
        }}
      >
        {showingPhoto && photoId ? (
          <Photo id={photoId} alt={word} className="h-full w-full" />
        ) : (
          <Symbol symbol={symbol} size={symbolSize} />
        )}
        {hasPhoto && !showingPhoto && (
          <span className="absolute right-1 bottom-1 rounded-full bg-ink p-1.5 text-white" aria-label="Has photo">
            <Camera size={20} strokeWidth={2.5} />
          </span>
        )}
      </div>
      {subline && <span className="text-lg font-semibold text-ink-soft">{subline}</span>}
    </div>
  )
}
