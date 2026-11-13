import { createHash } from 'node:crypto';
import type { NewsArticle } from '../../entities/intelligence.js';
import { GdeltProvider } from './gdelt.provider.js';
import { downloadText, safeExternalUrl } from './http.js';
import { ProviderUnavailable, type FeedProvider } from '../../services/cached-feed.service.js';
function xmlText(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_whole, code: string) => { const value = code.startsWith('x') ? parseInt(code.slice(1), 16) : Number(code); return value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : ''; }).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
}
export function parseFederalReserveRss(xml: string, publisher = 'Reserva Federal de Estados Unidos', language = 'English'): NewsArticle[] {
  const articles: NewsArticle[] = [];
  for (const item of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const block = item[1] ?? '';
    const field = (name: string) => xmlText(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i').exec(block)?.[1] ?? '');
    const url = safeExternalUrl(field('link'));
    const title = field('title');
    const date = Date.parse(field('pubDate'));
    if (!url || !title || !Number.isFinite(date)) continue;
    articles.push({ id: createHash('sha256').update(url).digest('hex').slice(0, 20), title, url, publisher, indexedAt: new Date(date).toISOString(), language, topics: ['Macroeconomía'], dateKind: 'published' });
  }
  return articles;
}
export class NewsProvider implements FeedProvider<NewsArticle> {
  readonly source = { name: 'GDELT Project y Reserva Federal', url: 'https://www.federalreserve.gov/feeds/feeds.htm', termsUrl: 'https://www.federalreserve.gov/disclaimer.htm', coverage: 'Referencias de GDELT y comunicados oficiales de la Reserva Federal. Títulos en idioma original, enlace y fecha; sin copiar fotografías ni artículos completos.' };
  notice = '';
  private gdeltRetryAt = 0;
  constructor(private readonly gdelt: FeedProvider<NewsArticle> = new GdeltProvider(), private readonly download = downloadText, private readonly clock: () => number = Date.now, private readonly fallback?: { url: string; publisher: string; language: string; termsUrl: string }) {
    if (fallback) this.source = { name: `GDELT Project y ${fallback.publisher}`, url: fallback.url, termsUrl: fallback.termsUrl, coverage: `Referencias en español de GDELT y comunicados oficiales del ${fallback.publisher}. Titulares originales, fuente y enlace. El contenido original se obtiene gratis en la fuente. La selección se ordena por fecha; no es un ranking de impacto.` };
  }
  private async loadGdelt(): Promise<NewsArticle[]> {
    if (this.clock() < this.gdeltRetryAt) throw new ProviderUnavailable('GDELT sigue en pausa por su límite de consultas.', this.gdeltRetryAt - this.clock());
    try { return await this.gdelt.load(); }
    catch (error) { this.gdeltRetryAt = this.clock() + (error instanceof ProviderUnavailable ? error.retryAfterMs : 60_000); throw error; }
  }
  async load(): Promise<NewsArticle[]> {
    const results = await Promise.allSettled([
      this.loadGdelt(),
      this.download(this.fallback?.url ?? 'https://www.federalreserve.gov/feeds/press_all.xml').then(xml => parseFederalReserveRss(xml, this.fallback?.publisher, this.fallback?.language)),
    ]);
    const articles = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    if (!articles.length) {
      const errors = results.flatMap(result => result.status === 'rejected' && result.reason instanceof ProviderUnavailable ? [result.reason.message] : []);
      throw new ProviderUnavailable(errors.join(' ') || 'Las fuentes de noticias no devolvieron referencias válidas.', 60_000);
    }
    this.notice = results.some(result => result.status === 'rejected') ? 'Una fuente no respondió. Se muestran las referencias disponibles de la otra fuente.' : '';
    return [...new Map(articles.map(article => [article.url, article])).values()].sort((a, b) => b.indexedAt.localeCompare(a.indexedAt)).slice(0, 60);
  }
}
