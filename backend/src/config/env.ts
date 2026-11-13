import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  FRONTEND_ORIGIN: z.url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATA_DIRECTORY: z.string().default('.data'),
  TWELVE_DATA_API_KEY: z.string().default(''),
  MARKET_DATA_LICENSE_CONFIRMED: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
});
export const env = schema.parse(process.env);
