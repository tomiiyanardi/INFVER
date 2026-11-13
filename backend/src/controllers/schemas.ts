import { z } from 'zod';
export const categorySchema = z.enum(['crypto', 'fixed-income-ar', 'liquidity', 'cedears', 'bonds']);
export const recommendationSchema = z.object({
  amount: z.number().finite().min(0.01).max(1_000_000_000).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001, 'Usá hasta dos decimales.'),
  currency: z.enum(['ARS', 'USD']), profile: z.enum(['conservative', 'moderate', 'aggressive']),
}).strict();
export const portfolioSchema = recommendationSchema.extend({ name: z.string().trim().min(1).max(80) });
export const answersSchema = z.object({ answers: z.array(z.object({ questionId: z.string().min(1).max(50), optionId: z.string().min(1).max(50) }).strict()).min(5).max(7) }).strict();
