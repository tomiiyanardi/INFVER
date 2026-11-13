import { MemoryInvestmentRepository, MemoryPortfolioRepository } from '../repositories/memory.repository.js';
import { createSeed } from '../seed.js';
import { InvestmentService } from '../services/investment.service.js';
import { ProfileService } from '../services/profile.service.js';
import { RecommendationService } from '../services/recommendation.service.js';
import { PortfolioService } from '../services/portfolio.service.js';
import { ApiController } from '../controllers/api.controller.js';
export function createContainer() {
  const investmentRepository = new MemoryInvestmentRepository(createSeed());
  const portfolioRepository = new MemoryPortfolioRepository();
  const investmentService = new InvestmentService(investmentRepository);
  const profileService = new ProfileService(investmentRepository);
  const recommendationService = new RecommendationService(investmentRepository);
  const portfolioService = new PortfolioService(portfolioRepository, recommendationService);
  const controller = new ApiController(investmentService, profileService, recommendationService, portfolioService);
  return { controller, investmentService, profileService, recommendationService, portfolioService };
}
