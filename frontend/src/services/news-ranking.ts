import type { NewsArticle } from '@/types/intelligence';

/**
 * Relevancia orientativa para armar la portada: palabras clave financieras, foco en Argentina,
 * presencia de imagen y antigüedad. No es una evaluación editorial del impacto de la noticia.
 */
const signals: [RegExp, number][] = [
  [/inflaci[oó]n|inflation|\bipc\b|\bcpi\b/i, 5],
  [/\bbcra\b|banco central|reserva federal|federal reserve|\bfed\b|\bfomc\b|\bbce\b|\becb\b/i, 5],
  [/argentin|milei|caputo|riesgo pa[ií]s|\bmerval\b|\bcedears?\b/i, 5],
  [/tasas? de inter[eé]s|tipos? de inter[eé]s|interest rates?|rate (cut|hike)|eur[ií]bor|plazo fijo/i, 4],
  [/d[oó]lar|dollar|tipo de cambio|devalua|\bpeso\b/i, 4],
  [/wall street|s&p|nasdaq|dow jones|bolsa|stocks?|acciones|mercados?|markets?/i, 3],
  [/bonos?|bonds?|treasur|deuda|debt/i, 3],
  [/bitcoin|cripto|crypto|ethereum/i, 3],
  [/recesi[oó]n|recession|crisis|default|desplom|plunge|crash|r[eé]cord|surge|soar/i, 3],
  [/resultados|ganancias|earnings|balance/i, 2],
  [/petr[oó]leo|\boil\b|\boro\b|\bgold\b|commodities|materias primas/i, 2],
];

export function newsScore(article: NewsArticle, now = Date.now()): number {
  const keywords = signals.reduce((total, [pattern, weight]) => total + (pattern.test(article.title) ? weight : 0), 0);
  const ageHours = Math.max(0, (now - Date.parse(article.indexedAt)) / 3_600_000);
  return keywords + (article.image ? 3 : 0) - Math.min(ageHours * 0.15, 40);
}

/** Ordena por relevancia evitando que un mismo medio acapare los primeros lugares. */
export function rankNews(articles: NewsArticle[], now = Date.now()): NewsArticle[] {
  const scored = articles.map(article => ({ article, score: newsScore(article, now) })).sort((a, b) => b.score - a.score || b.article.indexedAt.localeCompare(a.article.indexedAt));
  const perPublisher = new Map<string, number>();
  const top: NewsArticle[] = [];
  const rest: NewsArticle[] = [];
  for (const { article } of scored) {
    const count = perPublisher.get(article.publisher) ?? 0;
    if (top.length < 8 && count < 2) { top.push(article); perPublisher.set(article.publisher, count + 1); }
    else rest.push(article);
  }
  return [...top, ...rest];
}

export function relativeTime(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60_000);
  if (!Number.isFinite(minutes)) return '';
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Ayer' : `Hace ${days} días`;
}
