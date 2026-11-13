import type { Asset, Category, CategoryId, Portfolio, ProfileId, ProfilePolicy, Question } from '../entities/domain.js';
import type { InvestmentRepository, PortfolioRepository } from './contracts.js';
export interface SeedData { categories: Category[]; assets: Asset[]; questions: Question[]; policies: ProfilePolicy[] }
export class MemoryInvestmentRepository implements InvestmentRepository {
  constructor(private readonly data: SeedData) {}
  async getCategories() { return structuredClone(this.data.categories); }
  async getAssets(categoryId?: CategoryId) { return structuredClone(this.data.assets.filter(asset => !categoryId || asset.categoryId === categoryId)); }
  async findAsset(id: string) { return structuredClone(this.data.assets.find(asset => asset.id === id)); }
  async getQuestions() { return structuredClone(this.data.questions); }
  async getPolicy(id: ProfileId) {
    const policy = this.data.policies.find(item => item.id === id);
    if (!policy) throw new Error('Perfil sin política configurada');
    return structuredClone(policy);
  }
}
export class MemoryPortfolioRepository implements PortfolioRepository {
  private readonly portfolios = new Map<string, Portfolio>();
  async save(portfolio: Portfolio) { this.portfolios.set(portfolio.id, structuredClone(portfolio)); return structuredClone(portfolio); }
  async list() { return structuredClone([...this.portfolios.values()].reverse()); }
  async find(id: string) { return structuredClone(this.portfolios.get(id)); }
  async delete(id: string) { return this.portfolios.delete(id); }
}
