import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { inProcessClient } from './http-client.js';
test('contrato REST: salud, catálogo, validaciones, perfil, recomendación y carteras', async () => {
  const fetch = inProcessClient(createApp());
  const base = '/api/v1';
  const post = (path: string, body: unknown) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    assert.equal((await fetch(base + '/health')).status, 200);
    const catalog: { data: { id: string }[] } = await (await fetch(base + '/assets')).json(); assert.equal(catalog.data.length, 15);
    const filtered: { data: { categoryId: string }[] } = await (await fetch(base + '/assets?categoryId=crypto')).json(); assert.equal(filtered.data.length, 3);
    assert.equal((await fetch(base + '/assets/missing')).status, 404);
    assert.equal((await fetch(base + '/assets?categoryId=unknown')).status, 422);
    const input = { amount: 1000.01, currency: 'USD', profile: 'moderate' };
    for (const invalid of [{ ...input, amount: -1 }, { ...input, amount: 1.001 }, { ...input, currency: 'EUR' }, { ...input, profile: 'inventado' }, { ...input, extra: true }]) assert.equal((await post('/recommendations', invalid)).status, 422);
    assert.equal((await post('/recommendations', input)).status, 200);
    assert.equal((await post('/profiles/evaluate', { answers: [] })).status, 422);
    const questions: { data: { id: string; options: { id: string }[] }[] } = await (await fetch(base + '/profiles/questions')).json();
    const evaluated = await post('/profiles/evaluate', { answers: questions.data.map(question => ({ questionId: question.id, optionId: 'maximum' })) }); assert.equal(evaluated.status, 200);
    const created = await post('/portfolios', { ...input, name: 'Prueba' }); assert.equal(created.status, 201);
    const body: { data: { id: string } } = await created.json();
    assert.equal((await fetch(base + '/portfolios/' + body.data.id)).status, 200);
    assert.equal((await fetch(base + '/portfolios/' + body.data.id, { method: 'DELETE' })).status, 204);
    assert.equal((await fetch(base + '/portfolios/' + body.data.id)).status, 404);
    const malformed = await fetch(base + '/recommendations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }); assert.equal(malformed.status, 400);
    const cors = await fetch(base + '/health', { headers: { Origin: 'http://localhost:3000' } }); assert.equal(cors.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.equal((await fetch(base + '/unknown')).status, 404);
  } finally { /* El transporte de prueba no abre sockets ni necesita cerrar un servidor. */ }
});
