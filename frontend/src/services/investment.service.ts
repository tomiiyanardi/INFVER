import { request } from './http';
import type { Asset, Category, CategoryId, Portfolio, ProfileResult, Question, Recommendation, RecommendationInput } from '@/types/api';
export const investmentApi = {
  categories: (signal?: AbortSignal) => request<Category[]>('/categories', { signal }),
  assets: (categoryId?: CategoryId, signal?: AbortSignal) => request<Asset[]>(`/assets${categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : ''}`, { signal }),
  asset: (id: string) => request<Asset>(`/assets/${encodeURIComponent(id)}`),
  questions: (signal?: AbortSignal) => request<Question[]>('/profiles/questions', { signal }),
  evaluate: (answers: { questionId: string; optionId: string }[]) => request<ProfileResult>('/profiles/evaluate', { method: 'POST', body: JSON.stringify({ answers }) }),
  recommend: (input: RecommendationInput) => request<Recommendation>('/recommendations', { method: 'POST', body: JSON.stringify(input) }),
  portfolios: () => request<Portfolio[]>('/portfolios'),
  savePortfolio: (input: RecommendationInput & { name: string }) => request<Portfolio>('/portfolios', { method: 'POST', body: JSON.stringify(input) }),
  deletePortfolio: (id: string) => request<void>(`/portfolios/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
