import { Undo2 } from 'lucide-react'
import { useStore } from '../../lib/store'
import { BigButton } from './BigButton'

/** Undo, not confirm dialogs (PRD §6). */
export function Toast() {
  const store = useStore()
  const toast = store.state.toast
  if (!toast) return null
  return (
    <div className="rise pointer-events-none fixed inset-x-0 top-[6.5rem] z-50 flex justify-center px-3">
      <div className="pointer-events-auto flex items-center gap-4 rounded-3xl border-4 border-ink bg-paper px-5 py-3 shadow-2xl">
        <span className="text-2xl font-bold">{toast.message}</span>
        {toast.undo && (
          <BigButton
            variant="primary"
            onClick={() => {
              toast.undo?.()
              store.clearToast()
            }}
          >
            <Undo2 size={32} strokeWidth={3} />
            Undo
          </BigButton>
        )}
      </div>
    </div>
  )
}
