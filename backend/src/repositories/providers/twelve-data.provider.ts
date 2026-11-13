import { z } from 'zod';
import type { MarketSeries } from '../../entities/intelligence.js';
import type { FeedProvider } from '../../services/cached-feed.service.js';
import { downloadText } from './http.js';
export const marketSeriesSchema = z.object({ symbol: z.string(), name: z.string(), instrument: z.string(), risk: z.enum(['Bajo', 'Medio', 'Alto', 'Muy Alto']), assetId: z.string().nullable(), currency: z.literal('USD'), points: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), close: z.number().positive() })), splitAdjusted: z.literal(true) });
const closeSchema = z.string().transform(Number).pipe(z.number().positive().finite());
const responseSchema = z.object({ status: z.literal('ok'), meta: z.object({ symbol: z.string(), currency: z.literal('USD'), interval: z.literal('1day') }), values: z.array(z.object({ datetime: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), close: closeSchema })).min(2) });
const instruments: Omit<MarketSeries, 'points' | 'currency' | 'splitAdjusted'>[] = [
  { symbol: 'NVDA', name: 'Nvidia', instrument: 'Acción estadounidense subyacente; no precio local del CEDEAR', risk: 'Muy Alto', assetId: 'nvidia' },
  { symbol: 'SPY', name: 'SPDR S&P 500', instrument: 'ETF estadounidense subyacente; no precio local del CEDEAR', risk: 'Alto', assetId: 'spy' },
  { symbol: 'YPF', name: 'YPF', instrument: 'ADR de YPF en NYSE. La acción local es YPFD; no se clasifica como CEDEAR.', risk: 'Alto', assetId: null },
  { symbol: 'BTC/USD', name: 'Bitcoin', instrument: 'Criptomoneda volátil, diseñada para transferir valor sin un emisor central', risk: 'Muy Alto', assetId: 'bitcoin' },
  { symbol: 'ETH/USD', name: 'Ethereum', instrument: 'Activo nativo de la red de contratos inteligentes Ethereum', risk: 'Muy Alto', assetId: 'ethereum' },
];
export class TwelveDataProvider implements FeedProvider<MarketSeries> {
  readonly source = { name: 'Twelve Data', url: 'https://twelvedata.com/', termsUrl: 'https://twelvedata.com/terms', coverage: 'Selección: NVDA, SPY, ADR YPF, BTC/USD y ETH/USD. Cierres diarios ajustados por splits, excluyendo la vela del día en curso. No son precios intradiarios ni cotizaciones ARS de CEDEARs. Requiere plan y permisos para uso y exhibición a terceros.' };
  constructor(private readonly apiKey: string) {}
  async load(): Promise<MarketSeries[]> {
    const series: MarketSeries[] = [];
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    for (const instrument of instruments) {
      const url = new URL('https://api.twelvedata.com/time_series');
      url.search = new URLSearchParams({ symbol: instrument.symbol, interval: '1day', outputsize: '32', adjust: 'splits', order: 'desc', apikey: this.apiKey }).toString();
      const parsed = responseSchema.parse(JSON.parse(await downloadText(url.href)));
      if (parsed.meta.symbol !== instrument.symbol) throw new Error('Símbolo de cotización inesperado');
      series.push({ ...instrument, currency: 'USD', splitAdjusted: true, points: parsed.values.filter(point => point.datetime < today).map(point => ({ date: point.datetime, close: point.close })).sort((a, b) => a.date.localeCompare(b.date)) });
    }
    // Una descarga parcial no reemplaza el último conjunto completo.
    return series;
  }
}
