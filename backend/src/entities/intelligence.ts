import type { ProfileId, Risk } from './domain.js';
export interface FeedSource { name: string; url: string; termsUrl: string; coverage: string }
export interface FeedSnapshot<T> {
  status: 'updated' | 'stale' | 'unavailable' | 'disabled'; items: T[];
  fetchedAt: string | null; nextRefreshAt: string | null; message: string; source: FeedSource;
}
export interface NewsArticle { id: string; title: string; url: string; publisher: string; indexedAt: string; language: string; topics: string[]; dateKind?: 'published' | 'indexed'; image?: string | null }
export interface EconomicEvent { id: string; title: string; date: string; currency: 'USD'; importance: 'high' | 'medium'; sourceUrl: string; actual: null; forecast: null; previous: null }
export interface BankRate { id: string; bank: string; rate: number; basis: 'TNA' | 'TEA'; customerType: 'client' | 'non-client' | 'not-specified'; minimumAmount: number; days: number; reportedAt: string | null; conditions: string; sourceUrl: string }
export interface PricePoint { date: string; close: number }
export interface MarketSeries { symbol: string; name: string; instrument: string; risk: Risk; assetId: string | null; currency: 'USD'; points: PricePoint[]; splitAdjusted: true }
export interface MarketAlert { id: string; symbol: string; name: string; instrument: string; currency: 'USD'; close: number; changePercent: number; baseline: number; baselineDate: string; date: string; window: string; severity: 'red' | 'amber'; eligibleProfiles: ProfileId[]; analysis: string; action: 'review'; }
export interface CurrentQuote { symbol: string; name: string; currency: 'USD' | 'ARS'; price: number; buy: number | null; change24h: number | null; quotedAt: string | null; description: string; sourceUrl: string; severity: 'red' | 'amber' | null; changeBasis?: '24h' | 'previous-close' }
export interface MarketOverview { feed: FeedSnapshot<MarketSeries>; alerts: MarketAlert[]; quotes?: FeedSnapshot<CurrentQuote>; fxQuotes?: FeedSnapshot<CurrentQuote> }
