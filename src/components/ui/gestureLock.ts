/**
 * While a row is lifted and being dragged, swipes must not also move the day
 * carousel. A plain flag rather than state: it is read inside touch handlers,
 * which must stay cheap on the Tab A8.
 */
let locked = false

export function lockGestures() {
  locked = true
}

export function unlockGestures() {
  locked = false
}

export function gesturesLocked() {
  return locked
}
