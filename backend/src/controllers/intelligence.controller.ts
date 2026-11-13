import type { Request, Response } from 'express';
import { z } from 'zod';
import type { IntelligenceUseCases } from '../services/intelligence.service.js';
import type { MarketReader } from '../services/market-analysis.service.js';
export class IntelligenceController {
  constructor(private readonly intelligence: IntelligenceUseCases, private readonly market: MarketReader) {}
  news = async (req: Request, res: Response) => { const { language } = z.object({ language: z.enum(['es', 'en']).optional() }).parse(req.query); res.json({ data: await this.intelligence.news(language) }); };
  calendar = async (_req: Request, res: Response) => { res.json({ data: await this.intelligence.calendar() }); };
  rates = async (_req: Request, res: Response) => { res.json({ data: await this.intelligence.rates() }); };
  marketOverview = async (_req: Request, res: Response) => { res.json({ data: await this.market.overview() }); };
}
