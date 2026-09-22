import { Plus } from 'lucide-react'

/** The orange "+ Add" tile that ends every list (PRD §4.6). */
export function AddTile({ word = 'Add', onClick, className = '' }: { word?: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-3xl border-4 border-orange-dark bg-orange p-3 text-white transition-transform active:scale-95 ${className}`}
    >
      <Plus size={72} strokeWidth={4} />
      <span className="text-2xl font-extrabold">{word}</span>
    </button>
  )
}
