import type { BankRate, EconomicEvent, FeedSnapshot, NewsArticle } from '../entities/intelligence.js';
import type { CachedFeed } from './cached-feed.service.js';
export interface IntelligenceUseCases {
  news(language?: 'es' | 'en'): Promise<FeedSnapshot<NewsArticle>>;
  calendar(): Promise<FeedSnapshot<EconomicEvent>>;
  rates(): Promise<FeedSnapshot<BankRate>>;
}
export class IntelligenceService implements IntelligenceUseCases {
  constructor(private readonly newsFeed: CachedFeed<NewsArticle>, private readonly calendarFeed: CachedFeed<EconomicEvent>, private readonly rateFeed: CachedFeed<BankRate>, private readonly spanishNewsFeed?: CachedFeed<NewsArticle>) {}
  news(language?: 'es' | 'en') { return language === 'es' && this.spanishNewsFeed ? this.spanishNewsFeed.get() : this.newsFeed.get(); }
  calendar() { return this.calendarFeed.get(); }
  rates() { return this.rateFeed.get(); }
}
