import { z } from 'zod';
import type { BankRate } from '../../entities/intelligence.js';
const numberOrNull = z.number().nonnegative().nullish().default(null);
const bankSchema = z.object({ entidad: z.string().min(1), tnaClientes: numberOrNull, tnaNoClientes: numberOrNull, condiciones: z.string().nullish() });
export function parseArgentinaRates(payload: unknown): BankRate[] {
  const banks = z.array(z.unknown()).parse(payload).flatMap(item => { const parsed = bankSchema.safeParse(item); return parsed.success ? [parsed.data] : []; });
  const values = banks.flatMap(bank => [bank.tnaClientes, bank.tnaNoClientes]).filter((value): value is number => value !== null && value > 0);
  // La serie se publica como proporción; se admite también una versión homogénea en puntos porcentuales.
  const multiplier = values.length && values.every(value => value <= 1) ? 100 : 1;
  if (values.some(value => value > 1) && values.some(value => value > 0 && value < 1)) throw new Error('Unidades de tasa ambiguas');
  return banks.flatMap(bank => (['client', 'non-client'] as const).flatMap(customerType => {
    const value = customerType === 'client' ? bank.tnaClientes : bank.tnaNoClientes;
    if (value === null || value <= 0) return [];
    return [{ id: `argentina-datos-${bank.entidad}-${customerType}`, bank: bank.entidad, rate: Math.round(value * multiplier * 10000) / 10000, basis: 'TNA' as const, customerType, minimumAmount: 100000, days: 30, reportedAt: null, conditions: `Serie TNA a 30 días de ArgentinaDatos, referencia $100.000. ${bank.condiciones ?? ''} Verificar condiciones con la entidad.`, sourceUrl: 'https://argentinadatos.com/docs/operations/get-finanzas-tasas-plazo-fijo' }];
  }));
}
