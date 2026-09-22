import { usePhotoUrl } from './usePhotoUrl'

export function Photo({ id, alt = '', className = '' }: { id: string; alt?: string; className?: string }) {
  const url = usePhotoUrl(id)
  if (!url) return <div className={`bg-soft ${className}`} aria-hidden />
  return <img src={url} alt={alt} className={`object-cover ${className}`} draggable={false} />
}
