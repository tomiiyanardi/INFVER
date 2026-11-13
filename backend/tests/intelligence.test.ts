import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { parseGdelt } from '../src/repositories/providers/gdelt.provider.js';
import { parseBcraComparator, parseBcraRegistry } from '../src/repositories/providers/bcra.provider.js';
import { calendarDate, parseBlsCalendar } from '../src/repositories/providers/bls.provider.js';
import { CachedFeed, ProviderUnavailable } from '../src/services/cached-feed.service.js';
import { analyzeMarket } from '../src/services/market-analysis.service.js';
import { MarketAnalysisService } from '../src/services/market-analysis.service.js';
import { marketSeriesSchema } from '../src/repositories/providers/twelve-data.provider.js';
import { RecommendationService } from '../src/services/recommendation.service.js';
import { MemoryInvestmentRepository } from '../src/repositories/memory.repository.js';
import { createSeed } from '../src/seed.js';
import type { MarketSeries } from '../src/entities/intelligence.js';
const source = { name: 'Test', url: 'https://example.org/', termsUrl: 'https://example.org/terms', coverage: 'Fixture de prueba, nunca datos de producción' };
test('GDELT: normaliza fecha de indexación, elimina duplicados y rechaza URLs activas', () => {
  const item = { title: 'Nvidia earnings', url: 'https://example.org/news', seendate: '20261113T120000Z', language: 'English' };
  const result = parseGdelt(JSON.stringify({ articles: [item, item, { ...item, url: 'javascript:alert(1)' }] }));
  assert.equal(result.length, 1); assert.equal(result[0]?.indexedAt, '2026-11-13T12:00:00.000Z'); assert.deepEqual(result[0]?.topics, ['Empresas']);
});
test('GDELT: reconoce límite en texto HTTP 200 y configura backoff', () => {
  assert.throws(() => parseGdelt('Please limit requests to one every 5 seconds'), error => error instanceof ProviderUnavailable && error.retryAfterMs === 30 * 60_000);
});
test('caché: consultas concurrentes comparten una descarga y respetan TTL', async () => {
  let calls = 0; let now = Date.parse('2026-11-13T12:00:00Z');
  const feed = new CachedFeed('test', { source, async load() { calls++; await Promise.resolve(); return ['ok']; } }, z.string(), 900_000, undefined, true, '', undefined, () => now);
  const results = await Promise.all([feed.get(), feed.get(), feed.get()]); assert.equal(calls, 1); assert.ok(results.every(result => result.status === 'updated'));
  results[0]?.items.push('mutación'); assert.deepEqual((await feed.get()).items, ['ok']); assert.equal(calls, 1);
  now += 900_001; await feed.get(); assert.equal(calls, 2);
});
test('caché: caída conserva datos, publica stale y evita reintentos prematuros', async () => {
  let calls = 0; let now = Date.parse('2026-11-13T12:00:00Z');
  const feed = new CachedFeed('test', { source, async load() { calls++; if (calls > 1) throw new ProviderUnavailable('Pausa', 1_800_000); return ['último válido']; } }, z.string(), 900_000, undefined, true, '', undefined, () => now);
  await feed.get(); now += 900_001; const failed = await feed.get(); assert.equal(failed.status, 'stale'); assert.deepEqual(failed.items, ['último válido']);
  now += 900_001; await feed.get(); assert.equal(calls, 2);
});
test('caché: restauración persistida respeta TTL y conexión desactivada no consulta', async () => {
  let calls = 0;
  const provider = { source, async load() { calls++; return ['nuevo']; } };
  const saved = { async read() { return { items: ['persistido'], fetchedAt: '2026-11-13T12:00:00Z' }; }, async write() {} };
  const feed = new CachedFeed('test', provider, z.string(), 900_000, saved, true, '', undefined, () => Date.parse('2026-11-13T12:01:00Z'));
  assert.deepEqual((await feed.get()).items, ['persistido']); assert.equal(calls, 0);
  const disabled = new CachedFeed('test', provider, z.string(), 900_000, undefined, false, 'Licencia pendiente');
  assert.equal((await disabled.get()).status, 'disabled'); assert.equal(calls, 0);
});
test('BCRA: separa clientes, no clientes, no reportados y TNA', () => {
  const rates = parseBcraComparator('<table><tr><td>BANCO DE PRUEBA</td><td>25,5 %</td><td>27.25 %</td><td>Link</td></tr><tr><td>OTRO BANCO</td><td>-</td><td>0 %</td><td>-</td></tr></table>');
  assert.equal(rates.length, 3); assert.equal(rates[0]?.rate, 25.5); assert.equal(rates[1]?.customerType, 'non-client'); assert.equal(rates[2]?.rate, 0); assert.ok(rates.every(rate => rate.basis === 'TNA' && rate.days === 30));
});
test('BCRA: respaldo TEA excluye UVA, USD, moneda no declarada y plazos distintos', () => {
  const base = { codigoEntidad: 1, descripcionEntidad: 'BANCO TEST', fechaInformacion: '2026-11-13', nombreCompleto: 'PLAZO FIJO TRADICIONAL', denominacion: 'Pesos', montoMinimoInvertir: 1000, plazoMinimoInvertirDias: 30, canalConstitucion: 'Home banking', tasaEfectivaAnualMinima: 28 };
  const rates = parseBcraRegistry({ status: 200, results: [base, { ...base, denominacion: null }, { ...base, denominacion: 'Dólares estadounidenses' }, { ...base, nombreCompleto: 'PLAZO FIJO UVA' }, { ...base, plazoMinimoInvertirDias: 90 }] });
  assert.equal(rates.length, 1); assert.equal(rates[0]?.basis, 'TEA'); assert.equal(rates[0]?.rate, 28);
});
test('calendario: convierte horario de verano e invierno sin desplazar horas arbitrariamente', () => {
  assert.equal(calendarDate('20260715T083000', 'America/New_York'), '2026-07-15T12:30:00.000Z');
  assert.equal(calendarDate('20261113T083000', 'America/New_York'), '2026-11-13T13:30:00.000Z');
  assert.equal(calendarDate('20261113T083000Z', ''), '2026-11-13T08:30:00.000Z');
  assert.equal(calendarDate('20261113T083000', ''), null);
});
test('calendario: despliega líneas plegadas y no inventa actual, consenso o eventos cancelados', () => {
  const text = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:cpi\r\nDTSTART;TZID=America/New_York:20261113T083000\r\nSUMMARY:Consumer Price\r\n Index\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nSTATUS:CANCELLED\r\nDTSTART:20261113T083000Z\r\nSUMMARY:Cancelado\r\nEND:VEVENT\r\nEND:VCALENDAR';
  const events = parseBlsCalendar(text); assert.equal(events.length, 1); assert.equal(events[0]?.title, 'Consumer PriceIndex'); assert.equal(events[0]?.importance, 'high'); assert.equal(events[0]?.actual, null);
});
const exampleSeries = (): MarketSeries => ({ symbol: 'NVDA', name: 'Nvidia', currency: 'USD', instrument: 'Acción subyacente, fixture', risk: 'Muy Alto', assetId: 'nvidia', splitAdjusted: true, points: [{ date: '2026-11-12', close: 100 }, { date: '2026-11-13', close: 70 }] });
test('alertas: caída 30%, base explícita, roja y excluida de conservador', () => {
  const alerts = analyzeMarket([exampleSeries()], Date.parse('2026-11-13T23:00:00Z'));
  assert.equal(alerts.length, 1); assert.equal(alerts[0]?.changePercent, -30); assert.equal(alerts[0]?.severity, 'red'); assert.equal(alerts[0]?.baseline, 100); assert.equal(alerts[0]?.action, 'review'); assert.ok(!alerts[0]?.eligibleProfiles.includes('conservative'));
});
test('alertas: series viejas no generan señales y fuente con error tampoco', async () => {
  assert.equal(analyzeMarket([exampleSeries()], Date.parse('2026-12-01')).length, 0);
  const feed = new CachedFeed('prices', { source, async load(): Promise<MarketSeries[]> { throw new Error('Fuente caída'); } }, marketSeriesSchema, 900_000);
  assert.equal((await new MarketAnalysisService(feed).overview()).alerts.length, 0);
});
test('conservador: suma 100%, sin bitcoin ni acciones; todos los activos tienen explicación', async () => {
  const service = new RecommendationService(new MemoryInvestmentRepository(createSeed()));
  const result = await service.recommend({ amount: 1000, currency: 'USD', profile: 'conservative' });
  assert.equal(result.allocations.reduce((sum, allocation) => sum + allocation.percentage, 0), 100);
  assert.deepEqual(result.allocations.find(item => item.id === 'crypto')?.assets, []);
  assert.deepEqual(result.allocations.find(item => item.id === 'cedears')?.assets, []);
  assert.ok(result.allocations.flatMap(item => item.assets).every(asset => asset.explanation.length > 40));
  assert.ok(createSeed().assets.every(asset => asset.education.whatIs && asset.education.howItWorks && asset.education.mainRisk));
});
