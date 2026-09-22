/** A big emoji/Makaton-placeholder symbol. `size` is a Tailwind text size class. */
export function Symbol({ symbol, size = 'text-6xl', className = '' }: { symbol: string; size?: string; className?: string }) {
  return (
    <span className={`symbol ${size} ${className}`} aria-hidden>
      {symbol}
    </span>
  )
}
