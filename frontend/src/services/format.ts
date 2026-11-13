import type { Currency } from '@/types/api';
export function money(value: number, currency: Currency) { return new Intl.NumberFormat('es-AR', { style: 'currency', currency, currencyDisplay: 'code', maximumFractionDigits: 2 }).format(value); }
