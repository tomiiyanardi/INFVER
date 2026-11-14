'use client';
import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Pause, Play } from 'lucide-react';
import { useFeed } from '@/hooks/use-feed';
import { intelligenceApi } from '@/services/intelligence.service';
import { argentinaTime } from './feed-status';
import type { CurrentQuote } from '@/types/intelligence';

const shortNames: Record<string, string> = { 'USD/CONTADOCONLIQUI': 'USD/CCL', 'USD/MAYORISTA': 'USD/MAY', 'USD/OFICIAL': 'USD/OFI' };
const number = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' });

function changeLabel(quote: CurrentQuote) {
  if (quote.change24h === null) return 'Sin variación informada';
  return quote.changeBasis === 'previous-close' ? 'Variación vs. cierre anterior' : 'Variación 24 h';
}

/** Barra de cotizaciones tipo pantalla de bolsa: símbolo, precio y variación. */
export function PriceTicker() {
  const { data, loading, error } = useFeed(intelligenceApi.market);
  const [paused, setPaused] = useState(false);
  const stockQuotes: CurrentQuote[] = (data?.feed.items ?? []).flatMap(series => {
    if (data?.quotes?.items.some(quote => quote.symbol === series.symbol)) return [];
    const latest = series.points.at(-1);
    const previous = series.points.at(-2);
    if (!latest) return [];
    const change = previous ? Math.round(((latest.close - previous.close) / previous.close) * 10_000) / 100 : null;
    return [{ symbol: series.symbol, name: series.name, currency: series.currency, price: latest.close, buy: null, change24h: change, changeBasis: 'previous-close', quotedAt: `${latest.date}T00:00:00Z`, description: 'Cierre diario', sourceUrl: data?.feed.source.url ?? '', severity: null }];
  });
  const quotes = [...(data?.fxQuotes?.items ?? []), ...(data?.quotes?.items ?? []), ...stockQuotes];
  const duration = { '--strip-duration': `${Math.max(35, quotes.length * 6)}s` } as CSSProperties;

  return <div className="market-strip" role="region" aria-label="Cotizaciones de referencia">
    <span className="strip-label"><span className="strip-dot" aria-hidden="true" />Mercado</span>
    <div className={`strip-viewport ${paused ? 'is-paused' : ''}`}>
      {quotes.length > 0 ? <div className="strip-track" style={duration}>
        {[0, 1].map(copy => <ul className="strip-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
          {quotes.map(quote => {
            const direction = quote.change24h === null || quote.change24h === 0 ? 'flat' : quote.change24h > 0 ? 'up' : 'down';
            return <li key={quote.symbol} title={`${quote.name} · ${quote.currency}${quote.quotedAt ? ` · ${argentinaTime(quote.quotedAt)}` : ''} · ${changeLabel(quote)}`}>
              <strong>{shortNames[quote.symbol] ?? quote.symbol}</strong>
              <span className="strip-price">{number.format(quote.price)}</span>
              <span className={`strip-change is-${direction}`}>
                <span aria-hidden="true">{direction === 'up' ? '▲' : direction === 'down' ? '▼' : '■'}</span>
                {quote.change24h === null ? '—' : `${percent.format(quote.change24h)}%`}
              </span>
            </li>;
          })}
        </ul>)}
      </div> : <span className="strip-status">{loading ? 'Consultando cotizaciones…' : error ? 'Cotizaciones no disponibles' : 'Sin cotizaciones por el momento'}</span>}
    </div>
    <Link href="/fuentes" className="strip-sources" title="CoinLore, DolarApi y ArgentinaDatos. No implica tiempo real.">Fuentes</Link>
    <button type="button" className="strip-toggle" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? 'Reanudar cotizaciones' : 'Pausar cotizaciones'}>{paused ? <Play size={11} /> : <Pause size={11} />}</button>
  </div>;
}
