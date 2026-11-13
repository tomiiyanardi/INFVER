import { z } from 'zod';
import type { CurrentQuote } from '../../entities/intelligence.js';
import { ProviderUnavailable, type FeedProvider } from '../../services/cached-feed.service.js';
import { downloadText } from './http.js';
export const currentQuoteSchema = z.object({ symbol: z.string(), name: z.string(), currency: z.enum(['ARS', 'USD']), price: z.number().positive(), buy: z.number().nonnegative().nullable(), change24h: z.number().nullable(), quotedAt: z.iso.datetime().nullable(), description: z.string(), sourceUrl: z.url(), severity: z.enum(['red', 'amber']).nullable() });
const numeric = z.union([z.string().min(1), z.number()]).transform(Number).pipe(z.number().finite());
const cryptoSchema = z.object({ data: z.array(z.object({ id: z.string(), symbol: z.string(), name: z.string(), nameid: z.string(), price_usd: numeric.pipe(z.number().positive()), percent_change_24h: numeric })), info: z.object({ time: z.number().positive() }) });
export function parseCoinLore(payload: unknown): CurrentQuote[] {
  const parsed = cryptoSchema.parse(payload);
  return parsed.data.filter(item => ['bitcoin', 'ethereum', 'tether'].includes(item.nameid)).map(item => ({ symbol: `${item.symbol}/USD`, name: item.name, currency: 'USD', price: item.price_usd, buy: null, change24h: item.percent_change_24h, quotedAt: new Date(parsed.info.time * 1000).toISOString(), description: item.symbol === 'USDT' ? 'Stablecoin de Tether; su paridad no es una garantía ni un depósito bancario.' : 'Criptomoneda volátil. Precio agregado de referencia, no una oferta de compra o venta.', sourceUrl: `https://www.coinlore.com/coin/${item.nameid}`, severity: item.percent_change_24h <= -20 ? 'red' : item.percent_change_24h <= -5 ? 'amber' : null }));
}
export class CoinLoreProvider implements FeedProvider<CurrentQuote> {
  constructor(private readonly download = downloadText) {}
  readonly source = { name: 'CoinLore', url: 'https://www.coinlore.com/', termsUrl: 'https://www.coinlore.com/cryptocurrency-data-api', coverage: 'BTC, ETH y USDT, si están en la respuesta de los primeros veinte activos. Precio agregado en USD y variación de 24 h informados por CoinLore; no son cotizaciones ejecutables. Actualización cada minuto.' };
  async load() {
    const quotes = parseCoinLore(JSON.parse(await this.download('https://api.coinlore.net/api/tickers/?start=0&limit=20')));
    if (!quotes.length) throw new ProviderUnavailable('CoinLore no devolvió los activos solicitados.', 60_000);
    return quotes;
  }
}
const fxSchema = z.array(z.object({ moneda: z.string(), casa: z.string(), nombre: z.string(), compra: z.number().nonnegative().nullable(), venta: z.number().positive().nullable(), fechaActualizacion: z.iso.datetime({ offset: true }) }));
export function parseDolarApi(payload: unknown): CurrentQuote[] {
  return fxSchema.parse(payload).filter(item => item.moneda === 'USD' && item.venta !== null).map(item => ({ symbol: `USD/${item.casa.toUpperCase()}`, name: `Dólar ${item.nombre}`, currency: 'ARS', price: item.venta ?? 0, buy: item.compra, change24h: null, quotedAt: new Date(item.fechaActualizacion).toISOString(), description: 'Pesos por dólar. Compra y venta de referencia; no incluye comisiones ni confirma disponibilidad para operar.', sourceUrl: 'https://dolarapi.com/', severity: null }));
}
export class DolarApiProvider implements FeedProvider<CurrentQuote> {
  constructor(private readonly download = downloadText) {}
  readonly source = { name: 'DolarApi', url: 'https://dolarapi.com/', termsUrl: 'https://dolarapi.com/docs/uso', coverage: 'Cotizaciones del dólar en ARS, según modalidades disponibles. Se conserva la fecha informada por el proveedor. Consulta cada tres horas conforme su recomendación de uso.' };
  async load() { return parseDolarApi(JSON.parse(await this.download('https://dolarapi.com/v1/dolares'))); }
}
