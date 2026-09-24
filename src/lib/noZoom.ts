/**
 * No pinch zoom (backlog item 1). The viewport meta and `touch-action` in
 * index.css cover Android; these cover what they miss:
 *  - Safari / iPad pinch (`gesturestart`),
 *  - trackpad pinch on laptops, which arrives as a ctrl + wheel event.
 * Deliberately no document-wide `touchmove` listener: a non-passive one would
 * make every scroll wait for the main thread, which lags on the Tab A8.
 * Keyboard zoom (Ctrl +/−) is left alone for sighted family members.
 */
export function blockPinchZoom() {
  document.addEventListener('gesturestart', e => e.preventDefault())
  document.addEventListener(
    'wheel',
    e => {
      if (e.ctrlKey) e.preventDefault()
    },
    { passive: false },
  )
}
