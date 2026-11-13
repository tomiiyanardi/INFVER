'use client';
import { useEffect, useState } from 'react';
import { CalendarDays, ExternalLink } from 'lucide-react';
import { useFeed } from '@/hooks/use-feed';
import { intelligenceApi } from '@/services/intelligence.service';
import { ErrorMessage, Loading } from '@/components/ui/feedback';
import { argentinaTime, FeedStatus } from './feed-status';
export function EconomicCalendar() {
  const { data, loading, error } = useFeed(intelligenceApi.calendar, 5 * 60_000);
  const [view, setView] = useState<'next' | 'archive'>('next');
  const [importance, setImportance] = useState('all');
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer); }, []);
  const events = (data?.items ?? []).filter(event => (view === 'next' ? Date.parse(event.date) >= now : Date.parse(event.date) < now) && (importance === 'all' || event.importance === 'high')).sort((a, b) => view === 'next' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)).slice(0, 80);
  return <section className="calendar-section"><div className="section-heading"><div><span className="eyebrow"><CalendarDays size={13} /> La agenda antes del movimiento</span><h2>Fechas para<br /><em>tener presentes.</em></h2></div><div className="calendar-controls"><div className="segmented"><button aria-pressed={view === 'next'} onClick={() => setView('next')}>Próximos</button><button aria-pressed={view === 'archive'} onClick={() => setView('archive')}>Archivo</button></div><label><span className="sr-only">Importancia del evento</span><select value={importance} onChange={event => setImportance(event.target.value)}><option value="all">Toda la agenda BLS</option><option value="high">Sólo alta importancia</option></select></label></div></div>
    {data && <FeedStatus feed={data} />}<ErrorMessage message={error} />{loading && <Loading text="Consultando la agenda oficial…" />}
    {events.length ? <div className="calendar-table-wrap"><table className="calendar-table"><thead><tr><th>Fecha y hora (Argentina)</th><th>Moneda</th><th>Importancia INFVER</th><th>Publicación</th><th>Fuente</th></tr></thead><tbody>{events.map(event => <tr key={event.id}><td><time dateTime={event.date}>{argentinaTime(event.date)}</time></td><td>{event.currency}</td><td><span className={`event-impact impact-${event.importance}`}>{event.importance === 'high' ? 'Alta' : 'Media'}</span></td><td>{event.title}</td><td><a href={event.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Consultar ${event.title} en BLS`}><ExternalLink size={15} /></a></td></tr>)}</tbody></table></div> : !loading && <div className="intelligence-empty"><CalendarDays size={25} /><h3>No hay eventos disponibles para este filtro.</h3><p>El archivo se construye con las descargas realizadas; no se inventan eventos ni resultados anteriores.</p></div>}
    {data && <p className="source-disclosure">{data.source.coverage} Consultamos la fuente cada seis horas. No mostramos columnas de consenso, valor actual o anterior porque este calendario no las provee.</p>}
  </section>;
}
