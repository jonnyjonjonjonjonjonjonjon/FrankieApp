import { useEffect, useState } from 'react'
import { cachedUrl, loadUrl } from '../../lib/images'

/** Object URL for a stored photo blob; null until loaded. */
export function usePhotoUrl(id: string | null | undefined): string | null {
  const [loaded, setLoaded] = useState<{ id: string; url: string | null } | null>(null)
  useEffect(() => {
    if (!id || cachedUrl(id)) return
    let alive = true
    void loadUrl(id).then(url => {
      if (alive) setLoaded({ id, url })
    })
    return () => {
      alive = false
    }
  }, [id])
  if (!id) return null
  return cachedUrl(id) ?? (loaded?.id === id ? loaded.url : null)
}
