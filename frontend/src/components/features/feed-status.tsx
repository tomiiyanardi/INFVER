import { Clock3, ExternalLink } from 'lucide-react';
import type { FeedSnapshot } from '@/types/intelligence';
export function argentinaTime(value: string) { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(value)); }
export function FeedStatus<T>({ feed }: { feed: FeedSnapshot<T> }) {
  const label = { updated: 'Descarga actualizada', stale: 'Datos anteriores', unavailable: 'Fuente no disponible', disabled: 'Conexión pendiente' }[feed.status];
  return <div className={`feed-status feed-${feed.status}`}><span className="feed-state"><span className="color-dot" />{label}</span><span><Clock3 size={12} />{feed.fetchedAt ? `Descarga: ${argentinaTime(feed.fetchedAt)} (AR)` : 'Todavía no hay una descarga válida'}</span><a href={feed.source.url} target="_blank" rel="noreferrer">{feed.source.name}<ExternalLink size={12} /></a>{(feed.status !== 'updated' || feed.message !== 'Información de la última descarga. No implica tiempo real.') && <p>{feed.message}</p>}</div>;
}
