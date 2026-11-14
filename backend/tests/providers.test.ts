import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadText } from '../src/repositories/providers/http.js';
import { NewsProvider, extractShareImage, parseFederalReserveRss } from '../src/repositories/providers/news.provider.js';
import { parseArgentinaRates } from '../src/repositories/providers/argentina-rates.provider.js';
import { parseCoinLore, parseDolarApi, previousClose, withPreviousClose } from '../src/repositories/providers/current-quotes.provider.js';
import { parseGdelt } from '../src/repositories/providers/gdelt.provider.js';
import { ProviderUnavailable } from '../src/services/cached-feed.service.js';
const source = { name: 'Fixture', url: 'https://example.org', termsUrl: 'https://example.org/terms', coverage: 'Prueba' };
test('descargador: sigue redirección canónica segura y decodifica español ISO-8859-1', async () => {
  let calls = 0;
  const fake: typeof fetch = async () => ++calls === 1 ? new Response(null, { status: 301, headers: { location: '/feed/' } }) : new Response(new Uint8Array([0x54, 0x61, 0x73, 0x61, 0x73, 0x20, 0xe1]), { headers: { 'content-type': 'text/html; charset=iso-8859-1' } });
  assert.equal(await downloadText('https://example.org/feed', fake), 'Tasas á'); assert.equal(calls, 2);
});
test('descargador: no sigue redirecciones a otro dominio ni expone errores genéricos de DNS', async () => {
  let calls = 0;
  const redirect: typeof fetch = async () => { calls++; return new Response(null, { status: 302, headers: { location: 'https://otro.example/privado' } }); };
  await assert.rejects(() => downloadText('https://example.org/', redirect), /destino no autorizado/); assert.equal(calls, 1);
  const failure: typeof fetch = async () => { throw new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } }); };
  await assert.rejects(() => downloadText('https://example.org/', failure), /DNS/);
});
test('noticias: RSS oficial funciona aunque GDELT devuelva su límite', async () => {
  const xml = '<rss><channel><item><title><![CDATA[Tasas &amp; mercado]]></title><link>https://www.federalreserve.gov/release.htm</link><pubDate>Fri, 13 Nov 2026 12:00:00 GMT</pubDate></item></channel></rss>';
  const provider = new NewsProvider({ source, async load() { throw new ProviderUnavailable('Límite GDELT'); } }, async () => xml);
  const articles = await provider.load(); assert.equal(articles.length, 1); assert.equal(articles[0]?.title, 'Tasas & mercado'); assert.equal(articles[0]?.dateKind, 'published'); assert.ok(provider.notice);
  assert.equal(parseFederalReserveRss('<rss/>').length, 0);
});
test('tasas: normaliza proporciones, separa clientes y tolera fila inválida sin inventar bancos', () => {
  const rates = parseArgentinaRates([{ entidad: 'Banco A', tnaClientes: 0.25, tnaNoClientes: 0.27 }, { entidad: 'Banco B', tnaClientes: 0.3 }, { foo: 1 }]);
  assert.equal(rates.length, 3); assert.equal(rates[0]?.rate, 25); assert.equal(rates[1]?.rate, 27); assert.equal(rates[1]?.customerType, 'non-client');
  assert.equal(parseArgentinaRates([{ entidad: 'Banco C', tnaClientes: 25 }])[0]?.rate, 25);
  assert.throws(() => parseArgentinaRates([{ entidad: 'Banco A', tnaClientes: 0.25, tnaNoClientes: 27 }]), /ambiguas/);
});
test('noticias: el respaldo RSS no reinicia el plazo de bloqueo de GDELT', async () => {
  let now = 100000; let calls = 0;
  const xml = '<rss><item><title>Fixture</title><link>https://example.org/news</link><pubDate>Fri, 13 Nov 2026 12:00:00 GMT</pubDate></item></rss>';
  const provider = new NewsProvider({ source, async load() { calls++; throw new ProviderUnavailable('Límite GDELT', 30 * 60_000); } }, async () => xml, () => now);
  await provider.load(); now += 15 * 60_000; await provider.load(); assert.equal(calls, 1);
  now += 15 * 60_000; await provider.load(); assert.equal(calls, 2);
});
test('precios: cotización actual y variación vienen de la respuesta, sin reconstruir un histórico', () => {
  const quotes = parseCoinLore({ info: { time: 1794571200 }, data: [{ id: '90', symbol: 'BTC', name: 'Bitcoin', nameid: 'bitcoin', price_usd: '100', percent_change_24h: '-30' }] });
  assert.equal(quotes[0]?.price, 100); assert.equal(quotes[0]?.change24h, -30); assert.equal(quotes[0]?.severity, 'red'); assert.equal('points' in (quotes[0] ?? {}), false);
  const fx = parseDolarApi([{ moneda: 'USD', casa: 'bolsa', nombre: 'Bolsa', compra: 1000, venta: 1020, fechaActualizacion: '2026-11-13T12:00:00Z' }]);
  assert.equal(fx[0]?.currency, 'ARS'); assert.equal(fx[0]?.price, 1020); assert.equal(fx[0]?.buy, 1000);
});

test('noticias: respaldo español conserva idioma, fuente y titular completo ante caída de GDELT', async () => {
  const title = 'Informe económico '.repeat(14).trim();
  const xml = '<rss><item><title>' + title + '</title><link>https://www.bde.es/noticia</link><pubDate>Fri, 13 Nov 2026 12:00:00 GMT</pubDate></item></rss>';
  const provider = new NewsProvider({ source, async load() { throw new ProviderUnavailable('Límite'); } }, async () => xml, Date.now, { url: 'https://www.bde.es/rss', publisher: 'Banco de España', language: 'Spanish', termsUrl: 'https://www.bde.es/terms' });
  const articles = await provider.load();
  assert.equal(articles[0]?.language, 'Spanish');
  assert.equal(articles[0]?.publisher, 'Banco de España');
  assert.equal(articles[0]?.title, title);
  assert.match(provider.source.coverage, /gratis/);
});

test('noticias: imagen de portada sólo HTTPS, desde RSS, Open Graph o GDELT', async () => {
  assert.equal(extractShareImage('<head><meta content="/img/portada.jpg" property="og:image"></head>', 'https://example.org/nota'), 'https://example.org/img/portada.jpg');
  assert.equal(extractShareImage('<meta name="twitter:image" content="http://example.org/a.jpg">', 'https://example.org/nota'), null);
  assert.equal(extractShareImage('<p>sin metadatos</p>', 'https://example.org/nota'), null);
  const xml = '<rss><item><title>Con foto</title><link>https://example.org/n</link><pubDate>Fri, 13 Nov 2026 12:00:00 GMT</pubDate><enclosure url="https://cdn.example.org/f.jpg" type="image/jpeg"/></item></rss>';
  assert.equal(parseFederalReserveRss(xml)[0]?.image, 'https://cdn.example.org/f.jpg');
  const gdelt = parseGdelt(JSON.stringify({ articles: [{ title: 'Bitcoin sube', url: 'https://example.org/b', seendate: '20261113T120000Z', socialimage: 'https://example.org/b.jpg' }] }));
  assert.equal(gdelt[0]?.image, 'https://example.org/b.jpg');
  const page = '<meta property="og:image" content="https://example.org/og.jpg">';
  const provider = new NewsProvider({ source, async load() { return []; } }, async url => url.endsWith('.xml') ? xml.replace('<enclosure url="https://cdn.example.org/f.jpg" type="image/jpeg"/>', '') : page);
  const articles = await provider.load(); assert.equal(articles[0]?.image, 'https://example.org/og.jpg');
});
test('dólar: variación contra el último cierre anterior al día de la cotización', () => {
  const history = [{ casa: 'blue', fecha: '2026-11-11', compra: 1, venta: 1500 }, { casa: 'blue', fecha: '2026-11-12', compra: 1, venta: 1550 }, { casa: 'blue', fecha: '2026-11-13', compra: 1, venta: 1575 }];
  assert.equal(previousClose(history, '2026-11-13'), 1550);
  assert.equal(previousClose([], '2026-11-13'), null);
  const [quote] = parseDolarApi([{ moneda: 'USD', casa: 'blue', nombre: 'Blue', compra: 1555, venta: 1575, fechaActualizacion: '2026-11-13T15:00:00Z' }]);
  assert.ok(quote);
  const enriched = withPreviousClose(quote, 1550); assert.equal(enriched.change24h, 1.61); assert.equal(enriched.changeBasis, 'previous-close');
  assert.equal(withPreviousClose(quote, null).change24h, null);
});
