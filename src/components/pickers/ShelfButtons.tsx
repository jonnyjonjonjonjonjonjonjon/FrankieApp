import { categoriesFor } from '../../lib/categories'
import type { LibraryKind } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Symbol } from '../ui/Symbol'

/** Which shelf a word sits on: one toggle button per category of its kind (nothing for kinds without shelves). */
export function ShelfButtons({ kind, value, onChange }: { kind: LibraryKind; value: string | null; onChange: (id: string) => void }) {
  const cats = categoriesFor(kind)
  if (!cats.length) return null
  return (
    <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Shelf">
      {cats.map(c => {
        const on = c.id === value
        return (
          <BigButton key={c.id} variant={on ? 'primary' : 'secondary'} role="radio" aria-checked={on} onClick={() => onChange(c.id)}>
            <Symbol symbol={c.symbol} size="text-4xl" />
            <span className={`text-xl font-extrabold ${on ? 'text-white' : ''}`}>{c.word}</span>
          </BigButton>
        )
      })}
    </div>
  )
}
