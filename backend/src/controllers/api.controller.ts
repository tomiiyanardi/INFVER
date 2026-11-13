import type { Request, Response } from 'express';
import type { InvestmentService } from '../services/investment.service.js';
import type { ProfileService } from '../services/profile.service.js';
import type { RecommendationService } from '../services/recommendation.service.js';
import type { PortfolioService } from '../services/portfolio.service.js';
import { answersSchema, categorySchema, portfolioSchema, recommendationSchema } from './schemas.js';
import { z } from 'zod';
export class ApiController {
  constructor(private readonly investments: InvestmentService, private readonly profiles: ProfileService, private readonly recommendations: RecommendationService, private readonly portfolios: PortfolioService) {}
  categories = async (_req: Request, res: Response) => { res.json({ data: await this.investments.categories() }); };
  assets = async (req: Request, res: Response) => {
    const query = z.object({ categoryId: categorySchema.optional() }).strict().parse(req.query);
    res.json({ data: await this.investments.assets(query.categoryId) });
  };
  asset = async (req: Request, res: Response) => { res.json({ data: await this.investments.asset(z.string().parse(req.params.id)) }); };
  questions = async (_req: Request, res: Response) => { res.json({ data: await this.profiles.questions() }); };
  evaluate = async (req: Request, res: Response) => { res.json({ data: await this.profiles.evaluate(answersSchema.parse(req.body).answers) }); };
  recommend = async (req: Request, res: Response) => { res.json({ data: await this.recommendations.recommend(recommendationSchema.parse(req.body)) }); };
  listPortfolios = async (_req: Request, res: Response) => { res.json({ data: await this.portfolios.list() }); };
  createPortfolio = async (req: Request, res: Response) => { res.status(201).json({ data: await this.portfolios.create(portfolioSchema.parse(req.body)) }); };
  findPortfolio = async (req: Request, res: Response) => { res.json({ data: await this.portfolios.find(z.uuid().parse(req.params.id)) }); };
  deletePortfolio = async (req: Request, res: Response) => { await this.portfolios.delete(z.uuid().parse(req.params.id)); res.status(204).send(); };
}
