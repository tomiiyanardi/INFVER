import cors from 'cors';
import { env } from '../config/env.js';
export const corsMiddleware = cors({ origin: env.FRONTEND_ORIGIN, methods: ['GET', 'POST', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type'] });
