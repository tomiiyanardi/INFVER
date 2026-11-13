import { request } from './http';
import type { BankRate, EconomicEvent, FeedSnapshot, MarketOverview, NewsArticle } from '@/types/intelligence';
export const intelligenceApi = {
  news: (signal?: AbortSignal) => request<FeedSnapshot<NewsArticle>>('/news', { signal }),
  newsInLanguage: (language: 'es' | 'en', signal?: AbortSignal) => request<FeedSnapshot<NewsArticle>>(`/news?language=${language}`, { signal }),
  calendar: (signal?: AbortSignal) => request<FeedSnapshot<EconomicEvent>>('/calendar', { signal }),
  rates: (signal?: AbortSignal) => request<FeedSnapshot<BankRate>>('/bank-rates', { signal }),
  market: (signal?: AbortSignal) => request<MarketOverview>('/market/overview', { signal }),
};
