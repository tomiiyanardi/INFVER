'use client';
import { useState } from 'react';
import { Pause, Play, ArrowUpRight } from 'lucide-react';
import { useFeed } from '@/hooks/use-feed';
import { intelligenceApi } from '@/services/intelligence.service';
import { money } from '@/services/format';
import { argentinaTime } from './feed-status';
import { ErrorMessage, Loading } from '@/components/ui/feedback';
import type { CurrentQuote } from '@/types/intelligence';
export function PriceTicker() {
  const { data, loading, error, retry } = useFeed(intelligenceApi.market);
  const [paused, setPaused] = useState(false);
  const stockQuotes: CurrentQuote[] = (data?.feed.items ?? []).flatMap(series => {
    if (data?.quotes?.items.some(quote => quote.symbol === series.symbol)) return [];
    const latest = series.points.at(-1);
    const previous = series.points.at(-2);
    if (!latest) return [];
    return [{ symbol: series.symbol, name: series.name, currency: series.currency, price: latest.close, buy: null, change24h: null, quotedAt: `${latest.date}T00:00:00Z`, description: previous ? `Cierre anterior: ${previous.close}` : 'Cierre diario', sourceUrl: data?.feed.source.url ?? '', severity: null }];
  });
  const quotes = [...stockQuotes, ...(data?.quotes?.items ?? []), ...(data?.fxQuotes?.items ?? [])];
  const stale = data?.quotes?.status === 'stale' || data?.fxQuotes?.status === 'stale';
  return <section className="ticker-section" aria-label="Precios de mercado">
    <div className="ticker-heading"><div><span className="ticker-dot" />Mercado <small>{stale ? 'Últimos datos disponibles' : 'Referencias disponibles'}</small></div><button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? 'Reanudar carrusel' : 'Pausar carrusel'}>{paused ? <Play size={14} /> : <Pause size={14} />}</button></div>
    <ErrorMessage message={error} />{loading && <Loading text="Consultando precios…" />}
    {quotes.length > 0 ? <div className={`ticker-viewport ${paused ? 'is-paused' : ''}`}><div className="ticker-track">{[0, 1].map(copy => <div className="ticker-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>{quotes.map(quote => <a className="ticker-tile" key={quote.symbol} href={quote.sourceUrl} target="_blank" rel="noreferrer" tabIndex={copy === 1 ? -1 : 0}>
      <div><strong>{quote.symbol}</strong><ArrowUpRight size={13} /></div><span className="ticker-name">{quote.name}</span><b>{money(quote.price, quote.currency)}</b><span className={quote.change24h !== null && quote.change24h < 0 ? 'quote-negative' : 'quote-positive'}>{quote.change24h === null ? `${quote.currency} · ${quote.buy === null ? 'Cierre diario' : 'Venta'}` : `${quote.change24h > 0 ? '+' : ''}${quote.change24h.toLocaleString('es-AR')}% · 24 h`}</span><time dateTime={quote.quotedAt ?? undefined}>{stockQuotes.some(stock => stock.symbol === quote.symbol) ? quote.quotedAt?.slice(0, 10) : quote.quotedAt ? argentinaTime(quote.quotedAt) : 'Fecha no informada'}</time>
    </a>)}</div>)}</div></div> : !loading && <div className="ticker-empty"><span>No hay precios disponibles en este momento.</span><button type="button" onClick={retry}>Reintentar</button></div>}
    <p className="ticker-caption">Fuentes: CoinLore / DolarApi{stockQuotes.length ? ' / Twelve Data' : ''} · No implica tiempo real.{data?.feed.status === 'disabled' ? ' Acciones: proveedor pendiente de habilitación.' : ''}{data && (!data.quotes?.items.length || !data.fxQuotes?.items.length) ? ' Cobertura parcial: una fuente no devolvió precios.' : ''}</p>
  </section>;
}
