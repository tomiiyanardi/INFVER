import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../src/seed.js';
import { MemoryInvestmentRepository, MemoryPortfolioRepository } from '../src/repositories/memory.repository.js';
import { ProfileService } from '../src/services/profile.service.js';
import { RecommendationService, apportion } from '../src/services/recommendation.service.js';
import { PortfolioService } from '../src/services/portfolio.service.js';
import type { ProfileId } from '../src/entities/domain.js';
const repository = () => new MemoryInvestmentRepository(createSeed());
test('seed: 15 instrumentos, cinco categorías, referencias y políticas válidas', () => {
  const seed = createSeed();
  assert.equal(seed.assets.length, 15); assert.equal(seed.categories.length, 5);
  assert.equal(new Set(seed.assets.map(asset => asset.id)).size, 15);
  for (const asset of seed.assets) { assert.ok(asset.pros.length); assert.ok(asset.cons.length); assert.ok(asset.sources.every(source => new URL(source.url).protocol === 'https:')); }
  for (const policy of seed.policies) { assert.equal(policy.weights.reduce((sum, weight) => sum + weight.percentage, 0), 100); assert.equal(new Set(policy.weights.map(weight => weight.categoryId)).size, 5); }
});
test('perfil: límites del puntaje, capacidad financiera y opciones ocultas', async () => {
  const service = new ProfileService(repository());
  const seed = createSeed();
  for (const [optionId, expected] of [['low', 'conservative'], ['medium', 'conservative'], ['high', 'moderate'], ['maximum', 'aggressive']] as const) {
    const answers = seed.questions.map(question => ({ questionId: question.id, optionId }));
    assert.equal((await service.evaluate(answers)).profile, expected);
  }
  for (const id of ['horizon', 'liquidity', 'emergency']) {
    const answers = seed.questions.map(question => ({ questionId: question.id, optionId: question.id === id ? 'low' : 'maximum' }));
    assert.equal((await service.evaluate(answers)).profile, 'conservative');
  }
  assert.equal('score' in ((await service.questions())[0]?.options[0] ?? {}), false);
});
test('perfil: rechaza preguntas repetidas, faltantes y opciones inventadas', async () => {
  const service = new ProfileService(repository());
  const answers = createSeed().questions.map(question => ({ questionId: question.id, optionId: 'maximum' }));
  await assert.rejects(() => service.evaluate(answers.slice(1)));
  await assert.rejects(() => service.evaluate(answers.map(() => ({ questionId: 'horizon', optionId: 'maximum' }))));
  await assert.rejects(() => service.evaluate(answers.map(answer => ({ ...answer, optionId: 'invalid' }))));
});
test('asignación: conserva centavos para todos los perfiles y montos', async () => {
  const service = new RecommendationService(repository());
  for (const profile of ['conservative', 'moderate', 'aggressive'] satisfies ProfileId[]) {
    for (const amount of [0.01, 0.03, 1, 10.99, 1000, 999999.99, 1_000_000_000]) {
      const result = await service.recommend({ amount, currency: 'ARS', profile });
      assert.equal(result.allocations.reduce((sum, item) => sum + Math.round(item.amount * 100), 0), Math.round(amount * 100));
      assert.equal(result.allocations.reduce((sum, item) => sum + item.percentage, 0), 100);
      for (const allocation of result.allocations) assert.equal(allocation.assets.reduce((sum, asset) => sum + Math.round(asset.amount * 100), 0), Math.round(allocation.amount * 100));
      assert.ok(result.diversificationScore >= 0 && result.diversificationScore <= 100);
    }
  }
  assert.deepEqual(apportion(1, [0, 25, 35, 10, 30]), [0, 0, 1, 0, 0]);
});
test('asignación: conservador sin cripto; agresivo tiene mayor riesgo y tecnología', async () => {
  const service = new RecommendationService(repository());
  const conservative = await service.recommend({ amount: 1000, currency: 'USD', profile: 'conservative' });
  const aggressive = await service.recommend({ amount: 1000, currency: 'USD', profile: 'aggressive' });
  assert.equal(conservative.allocations.find(item => item.id === 'crypto')?.amount, 0);
  assert.ok(aggressive.riskScore > conservative.riskScore);
  assert.ok(aggressive.allocations.find(item => item.id === 'cedears')?.assets.some(asset => asset.assetId === 'nvidia'));
  assert.ok(!('annualReturn' in conservative));
});
test('repositorio: copias defensivas y carteras crear/listar/consultar/eliminar', async () => {
  const investments = repository();
  const items = await investments.getAssets(); items.pop(); assert.equal((await investments.getAssets()).length, 15);
  const service = new PortfolioService(new MemoryPortfolioRepository(), new RecommendationService(investments));
  const saved = await service.create({ name: 'Objetivo 2030', amount: 1500, currency: 'USD', profile: 'moderate' });
  assert.equal((await service.list()).length, 1); assert.equal((await service.find(saved.id)).name, 'Objetivo 2030');
  saved.name = 'mutación'; assert.equal((await service.find(saved.id)).name, 'Objetivo 2030');
  await service.delete(saved.id); assert.equal((await service.list()).length, 0); await assert.rejects(() => service.find(saved.id));
});
