import { lookup } from 'node:dns/promises';
const targets = [
  ['Noticias oficiales', 'https://www.federalreserve.gov/feeds/press_all.xml'],
  ['GDELT', 'https://api.gdeltproject.org/api/v2/doc/doc?query=Bitcoin&mode=artlist&format=json&timespan=24h&maxrecords=5'],
  ['Plazos fijos BCRA', 'https://www.bcra.gob.ar/plazos-fijos-online/'],
  ['Plazos fijos ArgentinaDatos', 'https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo/'],
  ['Criptomonedas CoinLore', 'https://api.coinlore.net/api/tickers/?start=0&limit=20'],
  ['Dólares DolarApi', 'https://dolarapi.com/v1/dolares'],
];
for (const [name, url] of targets) {
  const started = performance.now();
  try {
    await lookup(new URL(url).hostname);
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const body = await response.text();
    const limited = /Please limit requests|too many requests/i.test(body);
    console.log(JSON.stringify({ name, host: new URL(url).hostname, status: response.status, rateLimited: limited, bytes: Buffer.byteLength(body), milliseconds: Math.round(performance.now() - started) }));
    if (!response.ok || limited) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({ name, error: error.code ?? error.cause?.code ?? error.name, message: error.message }));
    process.exitCode = 1;
  }
}
console.log('Este diagnóstico consulta las fuentes una vez. ENOTFOUND indica un problema de DNS o un entorno sin acceso a Internet.');
