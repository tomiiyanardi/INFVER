import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { NewsArticle } from '../../entities/intelligence.js';
import { ProviderUnavailable, type FeedProvider } from '../../services/cached-feed.service.js';
import { downloadText, safeExternalUrl } from './http.js';
export const newsArticleSchema = z.object({ id: z.string(), title: z.string(), url: z.url(), publisher: z.string(), indexedAt: z.iso.datetime(), language: z.string(), topics: z.array(z.string()), dateKind: z.enum(['published', 'indexed']).optional(), image: z.url().nullable().optional() });
const gdeltSchema = z.object({ articles: z.array(z.object({ url: z.string(), title: z.string(), seendate: z.string(), domain: z.string().optional(), language: z.string().optional(), socialimage: z.string().optional() })) });
export function parseGdelt(text: string): NewsArticle[] {
  if (/Please limit requests|too many requests/i.test(text)) throw new ProviderUnavailable('GDELT activó su límite de consultas. Pausamos los intentos y conservamos la última descarga.', 30 * 60_000);
  const response = gdeltSchema.parse(JSON.parse(text));
  const unique = new Map<string, NewsArticle>();
  for (const article of response.articles) {
    const url = safeExternalUrl(article.url);
    const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(article.seendate);
    if (!url || !match) continue;
    const date = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`;
    if (!Number.isFinite(Date.parse(date))) continue;
    const title = article.title.replace(/<[^>]*>/g, '').trim().slice(0, 180);
    const topics = [/bitcoin|crypto|cripto|ethereum/i.test(title) ? 'Cripto' : '', /nvidia|apple|stocks|earnings|acciones|merval|wall street/i.test(title) ? 'Empresas' : '', /inflation|inflación|rates|reserve|tasas|banco central|bcra|d[oó]lar/i.test(title) ? 'Macroeconomía' : ''].filter(Boolean);
    const image = article.socialimage ? safeImageUrl(article.socialimage) : null;
    unique.set(url, { id: createHash('sha256').update(url).digest('hex').slice(0, 20), title, url, publisher: new URL(url).hostname.replace(/^www\./, ''), indexedAt: new Date(date).toISOString(), language: article.language ?? 'No informado', topics: topics.length ? topics : ['Mercados'], image });
  }
  return [...unique.values()].sort((a, b) => b.indexedAt.localeCompare(a.indexedAt));
}
const ENGLISH_QUERY = '(Nvidia OR Bitcoin OR inflation OR "interest rates" OR earnings OR "Federal Reserve" OR "Wall Street")';
const SPANISH_QUERY = '(inflación OR "tasas de interés" OR dólar OR Bitcoin OR "riesgo país" OR BCRA OR Merval OR "Wall Street" OR "Reserva Federal" OR bonos)';
/** Sólo imágenes HTTPS: evita contenido mixto y URLs con credenciales. */
export function safeImageUrl(value: string, base?: string): string | null {
  try { const url = new URL(value.trim(), base); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export class GdeltProvider implements FeedProvider<NewsArticle> {
  private static queue: Promise<void> = Promise.resolve();
  private static nextRequestAt = 0;
  constructor(private readonly language?: 'es' | 'en') {}
  readonly source = { name: 'GDELT Project', url: 'https://www.gdeltproject.org/', termsUrl: 'https://www.gdeltproject.org/about.html#termsofuse', coverage: 'Selección de referencias financieras de las últimas 24 horas. La fecha indica indexación, no publicación. Títulos en idioma original; no se copian notas ni fotografías.' };
  async load() {
    // All language feeds share the same upstream request budget.
    const reservation = GdeltProvider.queue.then(async () => {
      const delay = Math.max(0, GdeltProvider.nextRequestAt - Date.now());
      if (delay) await new Promise<void>(resolve => setTimeout(resolve, delay));
      GdeltProvider.nextRequestAt = Date.now() + 5_200;
    });
    GdeltProvider.queue = reservation.catch(() => {});
    await reservation;
    const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
    // Cada idioma necesita sus propios términos: los titulares en español casi nunca contienen "inflation" o "earnings".
    const terms = this.language === 'es' ? SPANISH_QUERY : ENGLISH_QUERY;
    const query = this.language ? `${terms} sourcelang:${this.language === 'es' ? 'spanish' : 'english'}` : terms;
    url.search = new URLSearchParams({ query, mode: 'artlist', format: 'json', timespan: '24h', maxrecords: '60', sort: 'datedesc' }).toString();
    const articles = parseGdelt(await downloadText(url.href));
    return this.language ? articles.filter(article => article.language.toLowerCase() === (this.language === 'es' ? 'spanish' : 'english')) : articles;
  }
}
