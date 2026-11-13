import { resolve } from 'node:path';
import { env } from './env.js';
import { FileFeedRepository } from '../repositories/feed.repository.js';
import { newsArticleSchema } from '../repositories/providers/gdelt.provider.js';
import { GdeltProvider } from '../repositories/providers/gdelt.provider.js';
import { downloadText } from '../repositories/providers/http.js';
import { NewsProvider } from '../repositories/providers/news.provider.js';
import { CoinLoreProvider, DolarApiProvider, currentQuoteSchema } from '../repositories/providers/current-quotes.provider.js';
import { BcraProvider, bankRateSchema } from '../repositories/providers/bcra.provider.js';
import { BlsProvider, economicEventSchema } from '../repositories/providers/bls.provider.js';
import { TwelveDataProvider, marketSeriesSchema } from '../repositories/providers/twelve-data.provider.js';
import { CachedFeed } from '../services/cached-feed.service.js';
import { IntelligenceService } from '../services/intelligence.service.js';
import { MarketAnalysisService } from '../services/market-analysis.service.js';
import { IntelligenceController } from '../controllers/intelligence.controller.js';
import type { EconomicEvent, NewsArticle } from '../entities/intelligence.js';
function mergeArchive<T>(current: T[], incoming: T[], id: (item: T) => string, date: (item: T) => string, limit: number): T[] {
  return [...new Map([...current, ...incoming].map(item => [id(item), item])).values()].sort((a, b) => date(b).localeCompare(date(a))).slice(0, limit);
}
export function createIntelligenceContainer() {
  const repository = new FileFeedRepository(resolve(env.DATA_DIRECTORY));
  const news = new CachedFeed('news-en-v1', new NewsProvider(new GdeltProvider('en')), newsArticleSchema, 15 * 60_000, repository);
  const spanishProvider = new GdeltProvider('es');
  const spanishNews = new CachedFeed('news-es-v2', new NewsProvider(spanishProvider, downloadText, Date.now, { url: 'https://www.bde.es/wbe/es/inicio/rss/rss-noticias/', publisher: 'Banco de España', language: 'Spanish', termsUrl: 'https://www.bde.es/wbe/es/pie/aviso-legal/' }), newsArticleSchema, 15 * 60_000, repository);
  const calendar = new CachedFeed('calendar', new BlsProvider(), economicEventSchema, 6 * 3600_000, repository, true, '', (a: EconomicEvent[], b: EconomicEvent[]) => mergeArchive(a, b, item => item.id, item => item.date, 1000));
  const rates = new CachedFeed('bank-rates-v3', new BcraProvider(), bankRateSchema, 3 * 3600_000, repository);
  const cryptoQuotes = new CachedFeed('crypto-current', new CoinLoreProvider(), currentQuoteSchema, 60_000);
  const fxQuotes = new CachedFeed('fx-current', new DolarApiProvider(), currentQuoteSchema, 3 * 3600_000);
  const prices = new CachedFeed('prices', new TwelveDataProvider(env.TWELVE_DATA_API_KEY), marketSeriesSchema, 6 * 3600_000, undefined, env.MARKET_DATA_LICENSE_CONFIRMED && !!env.TWELVE_DATA_API_KEY, 'Cotizaciones pendientes de configurar: se necesita una clave Twelve Data y autorización de uso y exhibición a terceros. No mostramos precios ni caídas ficticias.');
  const intelligenceService = new IntelligenceService(news, calendar, rates, spanishNews);
  const marketService = new MarketAnalysisService(prices, cryptoQuotes, fxQuotes);
  return { controller: new IntelligenceController(intelligenceService, marketService), marketService, intelligenceService,
    start() {
      const refresh = () => { void Promise.allSettled([news.get(), calendar.get(), rates.get(), prices.get(), cryptoQuotes.get(), fxQuotes.get()]); };
      refresh(); const timer = setInterval(refresh, 60_000); timer.unref();
      return () => clearInterval(timer);
    },
  };
}
