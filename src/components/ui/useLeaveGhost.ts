import { useLayoutEffect, type RefObject } from 'react'

/** Entrance classes a leaving copy must not replay. */
const ENTER = ['screen-in', 'from-right', 'from-left', 'pop-in', 'fade-in', 'open-in', 'rise']
/** Unmounts sooner than this after mounting are React's StrictMode check (development only), not a real close. */
const STRICT_MS = 80
/** Longest exit (see --move-slow in index.css) plus slack, in case animationend never comes. */
const SAFETY_MS = 2000

interface Options {
  /** Clip the copy to this ancestor (a selector), e.g. the day's scroller, so it can't cover the bars. */
  clipTo?: string
  zIndex?: number
}

/**
 * Screens slide back out when they close (owner, Sept 2026). React removes an
 * element at once, so on unmount this leaves a still copy of it in exactly the
 * same place (scroll positions and typed text included) and plays the exit
 * animation on the copy, then removes it. The copy can't be touched and is
 * hidden from screen readers. `exit` may be a function: it is asked just after
 * the commit, once whatever replaces the element has mounted (a new tab's view
 * says which way it came in, so the old one leaves the other way).
 */
export function useLeaveGhost(ref: RefObject<HTMLElement | null>, exit: string | (() => string), options: Options = {}) {
  const { clipTo, zIndex } = options
  useLayoutEffect(() => {
    const node = ref.current
    const born = performance.now()
    return () => {
      if (!node || performance.now() - born < STRICT_MS) return
      leaveGhost(node, exit, clipTo, zIndex)
    }
    // Mount/unmount only: the exit is read when the element goes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

function leaveGhost(node: HTMLElement, exit: string | (() => string), clipTo?: string, zIndex = 45) {
  if (!node.isConnected || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const rect = node.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const ghost = node.cloneNode(true) as HTMLElement
  ghost.classList.remove(...ENTER)
  // Nothing inside the copy moves on its own (a step's slide, a pulse): it only leaves.
  ghost.classList.add('leaving')
  ghost.removeAttribute('role')
  ghost.removeAttribute('data-view-frame')
  ghost.setAttribute('aria-hidden', 'true')
  ghost.inert = true
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    right: 'auto',
    bottom: 'auto',
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    pointerEvents: 'none',
    zIndex: String(zIndex),
  })
  // A see-through element (a view's frame) gets the page colour, so nothing shows through the copy.
  if (getComputedStyle(node).backgroundColor === 'rgba(0, 0, 0, 0)') ghost.style.backgroundColor = getComputedStyle(document.body).backgroundColor
  const box = clipTo ? node.parentElement?.closest(clipTo)?.getBoundingClientRect() : null
  if (box) {
    const t = Math.max(0, box.top - rect.top)
    const r = Math.max(0, rect.right - box.right)
    const b = Math.max(0, rect.bottom - box.bottom)
    const l = Math.max(0, box.left - rect.left)
    // As variables too, so an exit that animates the clip (roll-up) keeps these edges.
    ghost.style.setProperty('--clip-t', `${t}px`)
    ghost.style.setProperty('--clip-r', `${r}px`)
    ghost.style.setProperty('--clip-b', `${b}px`)
    ghost.style.setProperty('--clip-l', `${l}px`)
    ghost.style.clipPath = `inset(${t}px ${r}px ${b}px ${l}px)`
  }
  document.body.appendChild(ghost)

  // cloneNode copies neither scroll positions nor typed text: carry them over (same shape, same order).
  const from = node.querySelectorAll('*')
  const to = ghost.querySelectorAll('*')
  from.forEach((el, i) => {
    const copy = to[i]
    if (!copy) return
    if (el.scrollTop || el.scrollLeft) {
      copy.scrollTop = el.scrollTop
      copy.scrollLeft = el.scrollLeft
    }
    if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && 'value' in copy) {
      ;(copy as HTMLInputElement).value = el.value
    }
  })
  ghost.scrollTop = node.scrollTop

  const done = () => ghost.remove()
  const go = (cls: string) => {
    if (!cls) return done()
    ghost.addEventListener('animationend', e => e.target === ghost && done())
    ghost.classList.add(cls)
  }
  // A function is asked once React has finished this commit (a microtask, still before the next
  // paint), so the copy starts moving in the same frame as whatever came in to replace it.
  if (typeof exit === 'string') go(exit)
  else queueMicrotask(() => go(exit()))
  setTimeout(done, SAFETY_MS)
}
