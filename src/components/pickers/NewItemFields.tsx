import { categoriesFor } from '../../lib/categories'
import type { LibraryKind } from '../../types'
import { PictureChooser } from './PictureChooser'
import { ShelfButtons } from './ShelfButtons'
import type { NewItemDraft } from './newItemDraft'

interface Props {
  kind: LibraryKind
  draft: NewItemDraft
  onChange: (draft: NewItemDraft) => void
}

/**
 * Making a new word (PRD §4.6): Word → Shelf → Picture. Content only, so it
 * can sit in the full-screen NewItemForm or inline in the day's add card; the
 * caller owns the draft and its Yes / No.
 */
export function NewItemFields({ kind, draft, onChange }: Props) {
  const set = (patch: Partial<NewItemDraft>) => onChange({ ...draft, ...patch })
  const shelved = categoriesFor(kind).length > 0
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <section className="flex flex-col gap-2">
        <label className="text-2xl font-extrabold" htmlFor="new-word">
          1. Word
        </label>
        <input
          id="new-word"
          autoFocus
          value={draft.name}
          onChange={e => set({ name: e.target.value })}
          placeholder="Type the word"
          autoComplete="off"
          className="min-h-24 w-full rounded-2xl border-4 border-ink px-4 text-4xl font-extrabold outline-none focus:border-orange"
        />
      </section>

      {shelved && (
        <section className="flex flex-col gap-2">
          <h3 className="text-2xl font-extrabold">2. Shelf</h3>
          <ShelfButtons kind={kind} value={draft.category} onChange={category => set({ category })} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="text-2xl font-extrabold">{shelved ? 3 : 2}. Picture</h3>
        <PictureChooser
          word={draft.name}
          symbol={draft.symbol}
          onSymbol={symbol => set({ symbol })}
          photo={draft.photo}
          onPhoto={photo => set({ photo })}
          onClearPhoto={() => set({ photo: null })}
        />
      </section>
    </div>
  )
}
