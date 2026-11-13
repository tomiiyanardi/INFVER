import type { CategoryId } from '../entities/domain.js';
import type { InvestmentRepository } from '../repositories/contracts.js';
import { AppError } from './errors.js';
export class InvestmentService {
  constructor(private readonly repository: InvestmentRepository) {}
  categories() { return this.repository.getCategories(); }
  assets(categoryId?: CategoryId) { return this.repository.getAssets(categoryId); }
  async asset(id: string) {
    const asset = await this.repository.findAsset(id);
    if (!asset) throw new AppError(404, 'ASSET_NOT_FOUND', 'No encontramos ese activo.');
    return asset;
  }
}
