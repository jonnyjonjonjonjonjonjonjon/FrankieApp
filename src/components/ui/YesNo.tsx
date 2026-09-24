import { BigButton } from './BigButton'
import { Symbol } from './Symbol'

/**
 * The answer buttons for every question screen (backlog item 4): thumbs up
 * "Yes" and thumbs down "No", in place of Done / Cancel. Footers put No on the
 * left and Yes on the right (bottom-right, for her right index finger). The
 * thumbs are only ever used here, so a single-word reader can't mix them up
 * with Clear.
 */

const YES_SYMBOL = 'mb:good'
const NO_SYMBOL = 'mb:bad'
const CLEAR_SYMBOL = 'mb:remove-to'
/** Narrower on phones so Clear, No and Yes fit on one line at 412px. */
const PAD = 'max-sm:px-3'

interface Props {
  onClick: () => void
  disabled?: boolean
  word?: string
  /** Button height instead of the tall footer size: for a bar that shares its row with other controls. */
  compact?: boolean
}

/**
 * The symbol sits on a white square so the thumb reads clearly on green.
 * (Word size, weight and colour go on inner spans: the global
 * `button { font: inherit; color: inherit }` rule beats them on the button.)
 */
function Mark({ symbol, compact = false }: { symbol: string; compact?: boolean }) {
  return (
    <span className="rounded-xl bg-paper p-1">
      <Symbol symbol={symbol} size={compact ? 'text-4xl' : 'text-4xl sm:text-5xl'} />
    </span>
  )
}

export function YesButton({ onClick, disabled, word = 'Yes', compact }: Props) {
  return (
    <BigButton variant="green" size={compact ? 'sm' : 'lg'} className={PAD} disabled={disabled} onClick={onClick}>
      <Mark symbol={YES_SYMBOL} compact={compact} />
      <span className="text-2xl font-extrabold text-white">{word}</span>
    </BigButton>
  )
}

export function NoButton({ onClick, disabled, word = 'No', compact }: Props) {
  return (
    <BigButton variant="secondary" size={compact ? 'sm' : 'lg'} className={PAD} disabled={disabled} onClick={onClick}>
      <Mark symbol={NO_SYMBOL} compact={compact} />
      <span className="text-2xl font-extrabold">{word}</span>
    </BigButton>
  )
}

/** Takes a value away (was "None" / "No time"). Sits at the far left of a footer. */
export function ClearButton({ onClick, disabled, word = 'Clear' }: Props) {
  return (
    <BigButton variant="quiet" size="lg" className={`mr-auto ${PAD}`} disabled={disabled} onClick={onClick}>
      <Mark symbol={CLEAR_SYMBOL} />
      <span className="text-2xl font-extrabold">{word}</span>
    </BigButton>
  )
}
