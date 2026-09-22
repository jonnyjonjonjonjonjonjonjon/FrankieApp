import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { BigButton } from './BigButton'

interface Props {
  title: string
  symbol?: string
  onBack: () => void
  backWord?: string
  children: ReactNode
  /** Sticky bottom-right actions (primary actions sit right/bottom for her right index finger). */
  footer?: ReactNode
}

/** Full-screen panel with a visible Back button. Replaces dialogs. */
export function Sheet({ title, symbol, onBack, backWord = 'Back', children, footer }: Props) {
  return (
    <div className="rise fixed inset-0 z-40 flex flex-col bg-paper" role="dialog" aria-label={title}>
      <header className="flex items-center gap-3 border-b-4 border-line px-3 py-2">
        <BigButton variant="secondary" size="md" onClick={onBack} aria-label={backWord}>
          <ArrowLeft size={36} strokeWidth={3} />
          <span>{backWord}</span>
        </BigButton>
        <h2 className="flex flex-1 items-center gap-3 truncate text-3xl font-extrabold">
          {symbol && <span className="symbol text-4xl">{symbol}</span>}
          {title}
        </h2>
      </header>
      <div className="flex-1 overflow-y-auto px-3 py-4">{children}</div>
      {footer && (
        <footer className="safe-bottom flex justify-end gap-3 border-t-4 border-line bg-paper px-3 py-3">{footer}</footer>
      )}
    </div>
  )
}
