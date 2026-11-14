import { createHash } from 'node:crypto';
import type { NewsArticle } from '../../entities/intelligence.js';
import { GdeltProvider, safeImageUrl } from './gdelt.provider.js';
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
    const imageTag = /<(?:media:content|media:thumbnail|enclosure)\b[^>]*\burl=["']([^"']+)["'][^>]*>/i.exec(block);
    const isImage = imageTag && (!/\btype=["']/i.test(imageTag[0]) || /\btype=["']image\//i.test(imageTag[0]));
    articles.push({ id: createHash('sha256').update(url).digest('hex').slice(0, 20), title, url, publisher, indexedAt: new Date(date).toISOString(), language, topics: ['Macroeconomía'], dateKind: 'published', image: isImage && imageTag[1] ? safeImageUrl(xmlText(imageTag[1]), url) : null });
  }
  return articles;
}
/** Imagen de portada declarada por la propia nota (Open Graph / Twitter Card). */
export function extractShareImage(html: string, pageUrl: string): string | null {
  const head = html.slice(0, 200_000);
  for (const meta of head.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = meta[0];
    const key = /\b(?:property|name)=["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (key !== 'og:image' && key !== 'og:image:secure_url' && key !== 'twitter:image') continue;
    const content = /\bcontent=["']([^"']+)["']/i.exec(tag)?.[1];
    const image = content ? safeImageUrl(xmlText(content), pageUrl) : null;
    if (image) return image;
  }
  return null;
}
const IMAGE_LOOKUPS = 12;
const IMAGE_BUDGET_MS = 6_000;
export class NewsProvider implements FeedProvider<NewsArticle> {
  readonly source = { name: 'GDELT Project y Reserva Federal', url: 'https://www.federalreserve.gov/feeds/feeds.htm', termsUrl: 'https://www.federalreserve.gov/disclaimer.htm', coverage: 'Referencias de GDELT y comunicados oficiales de la Reserva Federal. Títulos en idioma original, enlace y fecha. Las imágenes son las de portada que cada medio publica para compartir su nota: se enlazan desde su origen, no se copian ni se almacenan.' };
  notice = '';
  private gdeltRetryAt = 0;
  /** Caché de imágenes por URL de nota: cada página se consulta una sola vez. */
  private readonly images = new Map<string, string | null>();
  constructor(private readonly gdelt: FeedProvider<NewsArticle> = new GdeltProvider(), private readonly download = downloadText, private readonly clock: () => number = Date.now, private readonly fallback?: { url: string; publisher: string; language: string; termsUrl: string }) {
    if (fallback) this.source = { name: `GDELT Project y ${fallback.publisher}`, url: fallback.url, termsUrl: fallback.termsUrl, coverage: `Referencias en español de GDELT y comunicados oficiales del ${fallback.publisher}. Titulares originales, fuente, enlace e imagen de portada enlazada desde el medio. El contenido original se obtiene gratis en la fuente. La portada destaca notas por palabras clave financieras y recencia; no es una evaluación editorial de impacto.` };
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
    const sorted = [...new Map(articles.map(article => [article.url, article])).values()].sort((a, b) => b.indexedAt.localeCompare(a.indexedAt)).slice(0, 60);
    await this.attachImages(sorted);
    return sorted.map(article => ({ ...article, image: article.image ?? this.images.get(article.url) ?? null }));
  }
  /** Busca la imagen de portada de las notas más recientes que no la traen, con un tiempo máximo total. */
  private async attachImages(articles: NewsArticle[]): Promise<void> {
    const pending = articles.filter(article => !article.image && !this.images.has(article.url)).slice(0, IMAGE_LOOKUPS);
    if (!pending.length) return;
    const lookups = pending.map(async article => {
      try { this.images.set(article.url, extractShareImage(await this.download(article.url), article.url)); }
      catch { this.images.set(article.url, null); }
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([Promise.allSettled(lookups), new Promise<void>(resolve => { timer = setTimeout(resolve, IMAGE_BUDGET_MS); })]);
    clearTimeout(timer);
    if (this.images.size > 500) for (const key of [...this.images.keys()].slice(0, this.images.size - 500)) this.images.delete(key);
  }
}
