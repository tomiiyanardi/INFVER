'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BellRing, CircleCheck, LockKeyhole, TrendingDown } from 'lucide-react';
import { useFeed } from '@/hooks/use-feed';
import { intelligenceApi } from '@/services/intelligence.service';
import { preferences } from '@/services/preferences.service';
import { money } from '@/services/format';
import type { ProfileId } from '@/types/api';
import { ErrorMessage, Loading } from '@/components/ui/feedback';
import { FeedStatus } from './feed-status';
import { CurrentQuotes } from './current-quotes';
export function MarketAlerts({ compact = false }: { compact?: boolean }) {
  const { data, loading, error } = useFeed(intelligenceApi.market);
  const [profile, setProfile] = useState<ProfileId>('conservative');
  useEffect(() => { const stored = preferences.readProfile(); if (stored) setProfile(stored); }, []);
  const alerts = data?.alerts.slice(0, compact ? 3 : 20) ?? [];
  return <section className="market-alert-section"><div className="section-heading"><div><h2>Mercado</h2></div><label className="profile-filter">Perspectiva<select value={profile} onChange={event => { const value = event.target.value; if (value === 'conservative' || value === 'moderate' || value === 'aggressive') setProfile(value); }}><option value="conservative">Conservadora</option><option value="moderate">Moderada</option><option value="aggressive">Agresiva</option></select></label></div>
    <ErrorMessage message={error} />{loading && <Loading text="Consultando precios…" />}
    {data?.quotes && <CurrentQuotes feed={data.quotes} title="Criptomonedas" compact={compact} />}
    {data?.fxQuotes && <CurrentQuotes feed={data.fxQuotes} title="Dólares" compact={compact} />}
    {alerts.map(alert => <article className={`market-alert alert-${alert.severity}`} key={alert.id}><div className="market-alert-heading"><span className="alert-symbol"><TrendingDown size={20} />{alert.symbol}</span><strong>{alert.changePercent.toLocaleString('es-AR')}%<small>en {alert.window}</small></strong></div><h3>{alert.name}: caída observada</h3><p>{alert.analysis}</p><div className="alert-price-detail"><span>Desde {money(alert.baseline, 'USD')} ({alert.baselineDate})</span><span>Hasta {money(alert.close, 'USD')} ({alert.date})</span></div><small>{alert.instrument}</small><div className={`suitability ${alert.eligibleProfiles.includes(profile) ? '' : 'excluded'}`}>{alert.eligibleProfiles.includes(profile) ? <CircleCheck size={15} /> : <LockKeyhole size={15} />}{alert.eligibleProfiles.includes(profile) ? 'Candidato a estudiar, sujeto a horizonte y capacidad de pérdida. La caída no habilita una compra automática.' : 'Fuera de la selección de este perfil. Una caída no reduce el riesgo del instrumento.'}</div></article>)}
    {data && <details className="source-details"><summary>Acciones y CEDEARs · {data.feed.status === 'disabled' ? 'proveedor pendiente' : alerts.length ? 'ver metodología' : 'sin alertas nuevas'}</summary><FeedStatus feed={data.feed} /><p className="source-disclosure">{data.feed.source.coverage} No mostramos datos de cripto como si fueran cotizaciones de Nvidia o YPF.</p><Link href="/fuentes" className="text-link">Ver fuentes y cobertura</Link></details>}
  </section>;
}
