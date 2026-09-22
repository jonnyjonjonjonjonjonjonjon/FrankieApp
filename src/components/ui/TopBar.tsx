import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { BigButton } from './BigButton'

interface Props {
  title: ReactNode
  onBack?: () => void
  backWord?: string
  right?: ReactNode
}

export function TopBar({ title, onBack, backWord = 'Back', right }: Props) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-4 border-line bg-paper px-3 py-2">
      {onBack && (
        <BigButton variant="secondary" onClick={onBack} aria-label={backWord}>
          <ArrowLeft size={36} strokeWidth={3} />
          <span>{backWord}</span>
        </BigButton>
      )}
      <div className="min-w-0 flex-1 text-3xl font-extrabold leading-tight max-sm:order-last max-sm:basis-full">{title}</div>
      {right && <div className="ml-auto flex gap-2">{right}</div>}
    </header>
  )
}
