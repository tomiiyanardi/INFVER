import { ProviderUnavailable } from '../../services/cached-feed.service.js';
export async function downloadText(url: string, fetcher: typeof fetch = fetch): Promise<string> {
  const initial = new URL(url);
  const signal = AbortSignal.timeout(8_000);
  let target = initial;
  let response: Response;
  try {
    let redirects = 0;
    while (true) {
      response = await fetcher(target.href, { headers: { Accept: 'application/json,application/rss+xml,text/xml,text/calendar,text/html', 'User-Agent': 'INFVER/1.0' }, signal, redirect: 'manual' });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location || ++redirects > 3) throw new ProviderUnavailable('La fuente devolvió demasiadas redirecciones.');
      const next = new URL(location, target);
      if (next.protocol !== 'https:' || next.hostname.replace(/^www\./, '') !== initial.hostname.replace(/^www\./, '') || next.username || next.password) throw new ProviderUnavailable('La fuente redirigió a un destino no autorizado.');
      target = next;
    }
  } catch (error) {
    if (error instanceof ProviderUnavailable) throw error;
    const cause = error instanceof Error && 'cause' in error && typeof error.cause === 'object' && error.cause !== null && 'code' in error.cause ? String(error.cause.code) : '';
    if (cause === 'ENOTFOUND' || cause === 'EAI_AGAIN') throw new ProviderUnavailable(`No se pudo resolver ${initial.hostname} (DNS). Revisá la conexión del servidor.`, 60_000);
    if (cause === 'EACCES' || cause === 'EPERM') throw new ProviderUnavailable(`El entorno bloquea la conexión a ${initial.hostname}.`, 60_000);
    if (cause.includes('CERT') || cause.includes('TLS')) throw new ProviderUnavailable(`No se pudo verificar el certificado de ${initial.hostname}. No se desactivó la validación TLS.`, 60_000);
    throw new ProviderUnavailable(`No se pudo conectar con ${initial.hostname}; la conexión falló o superó ocho segundos.`, 60_000);
  }
  if (response.status === 429) {
    const retry = response.headers.get('retry-after');
    const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : 0;
    const dateDelay = retry && !seconds ? Date.parse(retry) - Date.now() : 0;
    throw new ProviderUnavailable('La fuente pidió reducir las consultas. Reintentaremos luego de la pausa.', Math.max(15 * 60_000, seconds * 1000, dateDelay || 0));
  }
  if (!response.ok) throw new ProviderUnavailable(`${initial.hostname} respondió HTTP ${response.status}.`, response.status >= 500 ? 60_000 : 15 * 60_000);
  // Tope de bytes aplicado mientras se lee, incluso sin Content-Length.
  const reader = response.body?.getReader();
  if (!reader) throw new ProviderUnavailable('La fuente devolvió una respuesta vacía.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 5_000_000) { await reader.cancel(); throw new ProviderUnavailable('La respuesta supera el tamaño permitido.'); }
    chunks.push(chunk.value);
  }
  const bytes = Buffer.concat(chunks);
  const declared = /charset\s*=\s*["']?([^\s;"'>]+)/i.exec(response.headers.get('content-type') ?? '')?.[1]
    ?? /charset\s*=\s*["']?([^\s;"'>]+)/i.exec(bytes.subarray(0, 1024).toString('latin1'))?.[1] ?? 'utf-8';
  try { return new TextDecoder(declared).decode(bytes); }
  catch { return new TextDecoder('utf-8').decode(bytes); }
}
export function safeExternalUrl(value: string): string | null {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
