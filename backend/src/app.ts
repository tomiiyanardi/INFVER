import express from 'express';
import helmet from 'helmet';
import { createContainer } from './config/container.js';
import { createApiRouter } from './routes/api.routes.js';
import { corsMiddleware } from './middlewares/cors.middleware.js';
import { requestLogger } from './middlewares/request-logger.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { createIntelligenceContainer } from './config/intelligence-container.js';
import type { IntelligenceController } from './controllers/intelligence.controller.js';
export function createApp(intelligence: { controller: IntelligenceController } = createIntelligenceContainer()) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet(), corsMiddleware, requestLogger, express.json({ limit: '32kb' }));
  app.use('/api/v1', createApiRouter(createContainer().controller, intelligence.controller));
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'El endpoint no existe.' } }));
  app.use(errorMiddleware);
  return app;
}
