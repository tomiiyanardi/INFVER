import type { Allocation, Recommendation, RecommendationInput, Risk } from '../entities/domain.js';
import type { InvestmentRepository } from '../repositories/contracts.js';
const riskPoints: Record<Risk, number> = { Bajo: 1, Medio: 2, Alto: 3, 'Muy Alto': 4 };
// Mayor resto: conserva cada centavo, incluso con montos pequeños.
export function apportion(totalCents: number, weights: number[]): number[] {
  const sum = weights.reduce((total, weight) => total + weight, 0);
  if (sum <= 0) return weights.map(() => 0);
  const raw = weights.map(weight => totalCents * weight / sum);
  const result = raw.map(Math.floor);
  const order = raw.map((value, index) => ({ index, fraction: value - Math.floor(value) })).sort((a, b) => b.fraction - a.fraction);
  const remainder = totalCents - result.reduce((total, value) => total + value, 0);
  for (const item of order.slice(0, remainder)) result[item.index] = (result[item.index] ?? 0) + 1;
  return result;
}
export class RecommendationService {
  constructor(private readonly repository: InvestmentRepository) {}
  async recommend(input: RecommendationInput): Promise<Recommendation> {
    const policy = await this.repository.getPolicy(input.profile);
    const categories = await this.repository.getCategories();
    const categoryCents = apportion(Math.round(input.amount * 100), policy.weights.map(item => item.percentage));
    let weightedRisk = 0;
    const allocations: Allocation[] = [];
    for (const [index, weight] of policy.weights.entries()) {
      const category = categories.find(item => item.id === weight.categoryId);
      if (!category) throw new Error('Categoría de la política inexistente');
      if (weight.percentage === 0) { allocations.push({ ...category, percentage: 0, amount: 0, assets: [] }); continue; }
      const selectedAssets = await Promise.all(policy.assets[weight.categoryId].map(id => this.repository.findAsset(id)));
      if (selectedAssets.length === 0 || selectedAssets.some(asset => !asset || asset.categoryId !== category.id)) throw new Error('Política de activos inconsistente');
      const cents = categoryCents[index] ?? 0;
      const assetCents = apportion(cents, selectedAssets.map(() => 1));
      allocations.push({ ...category, percentage: weight.percentage, amount: cents / 100, assets: selectedAssets.flatMap((asset, assetIndex) => {
        if (!asset) return [];
        weightedRisk += riskPoints[asset.risk] * weight.percentage / 100 / selectedAssets.length;
        return [{ explanation: asset.education.whatIs, assetId: asset.id, name: asset.name, symbol: asset.symbol, percentageOfCategory: 100 / selectedAssets.length, amount: (assetCents[assetIndex] ?? 0) / 100, referenceCurrency: asset.referenceCurrency }];
      }) });
    }
    const concentration = policy.weights.reduce((total, item) => total + (item.percentage / 100) ** 2, 0);
    return {
      amount: Math.round(input.amount * 100) / 100, currency: input.currency, profile: input.profile, profileName: policy.name, allocations,
      riskScore: Math.round(weightedRisk * 25), diversificationScore: Math.round((1 - concentration) / 0.8 * 100),
      warnings: [
        'Distribución educativa basada en reglas; no constituye asesoramiento personalizado ni garantiza resultados.',
        `Los importes son presupuestos equivalentes en ${input.currency}; no son cantidades de títulos ni conversiones ejecutables.`,
        'Las tasas del catálogo son escenarios ilustrativos en la moneda indicada. No se agregan rendimientos ARS y USD.',
        'La diversificación mide concentración entre categorías; no incorpora correlaciones. El riesgo es una escala ordinal, no una probabilidad de pérdida.',
        'Se omiten comisiones, impuestos, spreads, restricciones operativas y mínimos de compra. La exposición puede diferir por redondeo.',
      ], createdAt: new Date().toISOString(),
    };
  }
}
