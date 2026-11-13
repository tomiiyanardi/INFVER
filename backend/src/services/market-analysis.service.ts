import type { CurrentQuote, MarketAlert, MarketOverview, MarketSeries } from '../entities/intelligence.js';
import type { ProfileId } from '../entities/domain.js';
import type { CachedFeed } from './cached-feed.service.js';
export function analyzeMarket(series: MarketSeries[], now = Date.now()): MarketAlert[] {
  const alerts: MarketAlert[] = [];
  for (const instrument of series) {
    if (!instrument.splitAdjusted) continue;
    const points = [...instrument.points].sort((a, b) => a.date.localeCompare(b.date));
    const latest = points.at(-1);
    if (!latest || now - Date.parse(`${latest.date}T23:59:59Z`) > 7 * 86400_000 || Date.parse(latest.date) > now) continue;
    for (const [sessions, threshold] of [[1, 5], [5, 10], [20, 20]] as const) {
      const baseline = points.at(-1 - sessions);
      if (!baseline || baseline.close <= 0 || latest.close <= 0 || baseline.date >= latest.date) continue;
      const changePercent = (latest.close / baseline.close - 1) * 100;
      if (changePercent > -threshold) continue;
      const eligibleProfiles: ProfileId[] = instrument.risk === 'Muy Alto' ? ['aggressive'] : instrument.risk === 'Alto' ? ['moderate', 'aggressive'] : ['conservative', 'moderate', 'aggressive'];
      alerts.push({ id: `${instrument.symbol}-${latest.date}-${sessions}`, symbol: instrument.symbol, name: instrument.name, instrument: instrument.instrument, currency: 'USD', close: latest.close, changePercent: Math.round(changePercent * 100) / 100, baseline: baseline.close, baselineDate: baseline.date, date: latest.date, window: `${sessions} ${instrument.symbol.includes('/') ? 'días' : 'ruedas'}`, severity: changePercent <= -20 || sessions === 1 && changePercent <= -10 ? 'red' : 'amber', eligibleProfiles, action: 'review', analysis: `${instrument.name} registra una caída frente al cierre de referencia. Una baja no demuestra que esté barato: revisar resultados, deuda, valuación, causas de la caída y riesgos. ${eligibleProfiles.includes('conservative') ? 'Puede estudiarse dentro del límite de riesgo del perfil.' : 'Se excluye de la selección conservadora por su riesgo.'} No se genera una orden ni una recomendación automática de compra.` });
    }
  }
  return alerts.sort((a, b) => a.changePercent - b.changePercent);
}
export interface MarketReader { overview(): Promise<MarketOverview> }
export class MarketAnalysisService implements MarketReader {
  constructor(private readonly feed: CachedFeed<MarketSeries>, private readonly cryptoQuotes?: CachedFeed<CurrentQuote>, private readonly fxQuotes?: CachedFeed<CurrentQuote>) {}
  async overview(): Promise<MarketOverview> {
    const [feed, quotes, fxQuotes] = await Promise.all([this.feed.get(), this.cryptoQuotes?.get(), this.fxQuotes?.get()]);
    // Datos atrasados o fuente caída pueden consultarse, pero no producen alertas nuevas.
    return { feed, alerts: feed.status === 'updated' ? analyzeMarket(feed.items) : [], quotes, fxQuotes };
  }
}
