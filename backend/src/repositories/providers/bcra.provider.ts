import { z } from 'zod';
import type { BankRate } from '../../entities/intelligence.js';
import { ProviderUnavailable, type FeedProvider } from '../../services/cached-feed.service.js';
import { downloadText } from './http.js';
import { parseArgentinaRates } from './argentina-rates.provider.js';
export const bankRateSchema = z.object({ id: z.string(), bank: z.string(), rate: z.number().nonnegative().max(1000), basis: z.enum(['TNA', 'TEA']), customerType: z.enum(['client', 'non-client', 'not-specified']), minimumAmount: z.number().nonnegative(), days: z.number().int().positive(), reportedAt: z.string().nullable(), conditions: z.string(), sourceUrl: z.url() });
const comparatorUrl = 'https://www.bcra.gob.ar/plazos-fijos-online/';
function plain(html: string): string { return html.replace(/<img\b[^>]*alt=["']([^"']*)["'][^>]*>/gi, ' $1 ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim(); }
function percentage(text: string): number | null {
  const match = /(\d+(?:[.,]\d+)?)\s*%/.exec(text);
  if (!match) return null;
  const value = Number(match[1]?.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 && value <= 1000 ? value : null;
}
export function parseBcraComparator(html: string): BankRate[] {
  const rates: BankRate[] = [];
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...(match[1] ?? '').matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => plain(cell[1] ?? ''));
    const bankIndex = cells.findIndex(cell => /BANCO|BANK|COMPAÑ[IÍ]A FINANCIERA/i.test(cell));
    if (bankIndex < 0) continue;
    const bank = cells[bankIndex]; if (!bank) continue;
    for (const [index, customerType] of ['client', 'non-client'].entries()) {
      const rate = percentage(cells[bankIndex + 1 + index] ?? '');
      if (rate === null) continue;
      rates.push({ id: `${bank}-${customerType}`, bank, rate, basis: 'TNA', customerType: customerType === 'client' ? 'client' : 'non-client', minimumAmount: 100000, days: 30, reportedAt: null, conditions: 'Referencia publicada para $100.000, online, intransferible a 30 días. Otros montos o condiciones pueden tener otra tasa.', sourceUrl: comparatorUrl });
    }
  }
  return rates;
}
const registrySchema = z.object({ status: z.literal(200), results: z.array(z.object({
  codigoEntidad: z.number(), descripcionEntidad: z.string(), fechaInformacion: z.string(),
  nombreCompleto: z.string(), nombreCorto: z.string().optional(), denominacion: z.string().nullable(),
  montoMinimoInvertir: z.number().nonnegative(), plazoMinimoInvertirDias: z.number().int().positive(),
  canalConstitucion: z.string(), tasaEfectivaAnualMinima: z.number().nonnegative().max(1000), masInformacion: z.string().nullable().optional(),
})) });
export function parseBcraRegistry(payload: unknown): BankRate[] {
  return registrySchema.parse(payload).results.filter(item =>
    item.denominacion?.toLowerCase() === 'pesos' && item.plazoMinimoInvertirDias === 30 &&
    /tradicional|intransferible/i.test(item.nombreCompleto) && !/uva|uvi|precancel|variable/i.test(item.nombreCompleto) &&
    /home.?banking|internet|online|todos los canales/i.test(item.canalConstitucion),
  ).map((item, index) => ({ id: `registry-${item.codigoEntidad}-${index}`, bank: item.descripcionEntidad, rate: item.tasaEfectivaAnualMinima, basis: 'TEA', customerType: 'not-specified', minimumAmount: item.montoMinimoInvertir, days: 30, reportedAt: item.fechaInformacion, conditions: `${item.nombreCompleto}. ${item.canalConstitucion}. ${item.masInformacion ?? ''} TEA mínima declarada; no equivale a la TNA del comparador.`, sourceUrl: 'https://api.bcra.gob.ar/transparencia/v1.0/PlazosFijos' }));
}
export class BcraProvider implements FeedProvider<BankRate> {
  constructor(private readonly download = downloadText) {}
  readonly source = { name: 'Banco Central de la República Argentina', url: comparatorUrl, termsUrl: 'https://www.bcra.gob.ar/regimen-de-transparencia/', coverage: 'Selección de entidades informantes. Comparador: TNA online a 30 días por $100.000, clientes y no clientes. Respaldo: API de Transparencia, TEA mínima en pesos, tradicional online a 30 días. Las bases se comparan por separado; no representa todos los bancos ni garantiza la tasa para tu monto.' };
  async load() {
    const errors: string[] = [];
    try {
      const rates = parseBcraComparator(await this.download(comparatorUrl));
      if (rates.length) { this.source.name = 'BCRA · comparador online'; this.source.url = comparatorUrl; return rates; }
    } catch (error) { if (error instanceof ProviderUnavailable) errors.push(error.message); }
    try {
      const rates = parseArgentinaRates(JSON.parse(await this.download('https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo/')));
      if (rates.length) {
        this.source.name = 'ArgentinaDatos · serie de plazos fijos';
        this.source.url = 'https://argentinadatos.com/docs/operations/get-finanzas-tasas-plazo-fijo';
        this.source.coverage = 'Selección de tasas TNA online a 30 días, referencia $100.000. Proveedor: ArgentinaDatos; fuentes originales identificadas en su documentación, incluido BCRA. No es una descarga directa del Banco Central ni cubre todos los bancos. Condiciones de uso: https://argentinadatos.com/docs/uso. La descarga no certifica cuándo el banco cambió la tasa.';
        return rates;
      }
    } catch (error) { if (error instanceof ProviderUnavailable) errors.push(error.message); }
    try {
      const rates = parseBcraRegistry(JSON.parse(await this.download('https://api.bcra.gob.ar/transparencia/v1.0/PlazosFijos')));
      if (rates.length) { this.source.name = 'BCRA · Régimen de Transparencia'; this.source.url = 'https://www.bcra.gob.ar/regimen-de-transparencia/'; return rates; }
    } catch (error) { if (error instanceof ProviderUnavailable) errors.push(error.message); }
    throw new ProviderUnavailable(errors.join(' ') || 'Las fuentes no devolvieron tasas comparables. Revisá el comparador oficial.', 60_000);
  }
}
