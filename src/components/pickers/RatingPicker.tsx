import { RATING_FACES } from '../../lib/symbols'
import type { Rating } from '../../types'
import { Symbol } from '../ui/Symbol'

interface Props {
  value: Rating | null
  onChange: (r: Rating | null) => void
  size?: 'md' | 'lg'
}

/** Did I like it? — 😊 happy · 😠 angry · 😢 sad (PRD §4.4). */
export function RatingPicker({ value, onChange, size = 'lg' }: Props) {
  return (
    <div className="flex gap-3">
      {(Object.keys(RATING_FACES) as Rating[]).map(r => (
        <button
          key={r}
          type="button"
          aria-label={RATING_FACES[r].word}
          aria-pressed={value === r}
          onClick={() => onChange(value === r ? null : r)}
          className={`flex flex-col items-center gap-1 rounded-3xl border-4 px-3 py-2 active:scale-95 ${
            value === r ? 'border-orange bg-orange-light' : 'border-line bg-paper'
          } ${value && value !== r ? 'opacity-50' : ''}`}
        >
          <Symbol symbol={RATING_FACES[r].symbol} size={size === 'lg' ? 'text-7xl' : 'text-5xl'} />
          <span className={`font-extrabold ${size === 'lg' ? 'text-xl' : 'text-lg'}`}>{RATING_FACES[r].word}</span>
        </button>
      ))}
    </div>
  )
}
