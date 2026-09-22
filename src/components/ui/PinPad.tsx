import { useState } from 'react'
import { Delete } from 'lucide-react'
import { BigButton } from './BigButton'

interface Props {
  title: string
  onSubmit: (pin: string) => boolean | Promise<boolean>
  length?: number
}

export function PinPad({ title, onSubmit, length = 4 }: Props) {
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)

  const press = async (d: string) => {
    if (pin.length >= length) return
    const next = pin + d
    setPin(next)
    setWrong(false)
    if (next.length === length) {
      const ok = await onSubmit(next)
      if (!ok) {
        setWrong(true)
        setPin('')
      }
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-5 py-4">
      <h3 className="text-3xl font-extrabold">{title}</h3>
      <div className="flex gap-4">
        {Array.from({ length }, (_, i) => (
          <span key={i} className={`h-7 w-7 rounded-full border-4 border-ink ${i < pin.length ? 'bg-ink' : 'bg-paper'}`} />
        ))}
      </div>
      <p className={`text-xl font-bold ${wrong ? 'text-ink' : 'invisible'}`}>Wrong PIN, try again</p>
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : k === 'del' ? (
            <BigButton key={i} size="lg" onClick={() => setPin(p => p.slice(0, -1))} aria-label="Delete">
              <Delete size={36} strokeWidth={2.5} />
            </BigButton>
          ) : (
            <BigButton key={i} size="lg" className="min-w-24" onClick={() => void press(k)}>
              {k}
            </BigButton>
          ),
        )}
      </div>
    </div>
  )
}
