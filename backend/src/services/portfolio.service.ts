import { randomUUID } from 'node:crypto';
import type { RecommendationInput } from '../entities/domain.js';
import type { PortfolioRepository } from '../repositories/contracts.js';
import type { RecommendationService } from './recommendation.service.js';
import { AppError } from './errors.js';
export class PortfolioService {
  constructor(private readonly repository: PortfolioRepository, private readonly recommendations: RecommendationService) {}
  list() { return this.repository.list(); }
  async create(input: RecommendationInput & { name: string }) {
    const recommendation = await this.recommendations.recommend(input);
    return this.repository.save({ ...recommendation, id: randomUUID(), name: input.name });
  }
  async find(id: string) {
    const portfolio = await this.repository.find(id);
    if (!portfolio) throw new AppError(404, 'PORTFOLIO_NOT_FOUND', 'La cartera no existe.');
    return portfolio;
  }
  async delete(id: string) { if (!await this.repository.delete(id)) throw new AppError(404, 'PORTFOLIO_NOT_FOUND', 'La cartera no existe.'); }
}
