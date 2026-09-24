import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'green' | 'ghost' | 'danger' | 'quiet'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const VARIANT: Record<Variant, string> = {
  primary: 'bg-orange text-white border-orange-dark active:bg-orange-dark',
  secondary: 'bg-paper text-ink border-ink active:bg-soft',
  green: 'bg-green text-white border-green active:brightness-90',
  ghost: 'bg-transparent text-ink border-transparent active:bg-soft',
  danger: 'bg-paper text-ink border-ink active:bg-soft',
  quiet: 'bg-paper text-ink border-line active:bg-soft',
}

const SIZE: Record<Size, string> = {
  sm: 'min-h-14 px-4 text-lg gap-2',
  md: 'min-h-[4.5rem] px-5 text-xl gap-3',
  lg: 'min-h-24 px-6 text-2xl gap-3',
}

/** Obvious bordered button (PRD §6 "standard website conventions"). */
export function BigButton({ variant = 'secondary', size = 'md', className = '', children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-2xl border-4 font-bold leading-tight transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
