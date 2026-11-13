import { Router } from 'express';
import type { ApiController } from '../controllers/api.controller.js';
import type { IntelligenceController } from '../controllers/intelligence.controller.js';
export function createApiRouter(controller: ApiController, intelligence: IntelligenceController) {
  const router = Router();
  router.get('/health', (_req, res) => res.json({ data: { status: 'ok', persistence: 'memory', mode: 'educational-demo' } }));
  router.get('/categories', controller.categories);
  router.get('/news', intelligence.news);
  router.get('/calendar', intelligence.calendar);
  router.get('/bank-rates', intelligence.rates);
  router.get('/market/overview', intelligence.marketOverview);
  router.get('/assets', controller.assets);
  router.get('/assets/:id', controller.asset);
  router.get('/profiles/questions', controller.questions);
  router.post('/profiles/evaluate', controller.evaluate);
  router.post('/recommendations', controller.recommend);
  router.get('/portfolios', controller.listPortfolios);
  router.post('/portfolios', controller.createPortfolio);
  router.get('/portfolios/:id', controller.findPortfolio);
  router.delete('/portfolios/:id', controller.deletePortfolio);
  return router;
}
