import type { Asset, Category, CategoryId, Portfolio, ProfileId, ProfilePolicy, Question } from '../entities/domain.js';
export interface InvestmentRepository {
  getCategories(): Promise<Category[]>;
  getAssets(categoryId?: CategoryId): Promise<Asset[]>;
  findAsset(id: string): Promise<Asset | undefined>;
  getQuestions(): Promise<Question[]>;
  getPolicy(profile: ProfileId): Promise<ProfilePolicy>;
}
export interface PortfolioRepository {
  save(portfolio: Portfolio): Promise<Portfolio>;
  list(): Promise<Portfolio[]>;
  find(id: string): Promise<Portfolio | undefined>;
  delete(id: string): Promise<boolean>;
}
