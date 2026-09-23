import { useState } from 'react'
import { symbolSrc } from '../../lib/symbolImages'

/**
 * A symbol drawn as a picture (Mulberry, else OpenMoji). `size` is a Tailwind
 * text size class: the picture is 1em square, so it sizes like the text it
 * sits beside. Falls back to the raw emoji if the picture can't load.
 */
export function Symbol({ symbol, size = 'text-6xl', className = '' }: { symbol: string; size?: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const broken = failed === symbol || !symbol
  return (
    <span className={`symbol inline-flex shrink-0 items-center justify-center leading-none ${size} ${className}`} aria-hidden>
      {broken ? (
        symbol.startsWith('mb:') ? '' : symbol
      ) : (
        <img src={symbolSrc(symbol)} alt="" draggable={false} className="h-[1.1em] w-[1.1em] object-contain" onError={() => setFailed(symbol)} />
      )}
    </span>
  )
}
