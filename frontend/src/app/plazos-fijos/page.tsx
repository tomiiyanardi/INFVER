import type { Metadata } from 'next';
import { BankRateComparator } from '@/components/features/bank-rate-comparator';
export const metadata: Metadata = { title: 'Comparador de plazos fijos' };
export default function RatesPage() { return <div className="page-shell inner-page"><div className="page-intro"><span className="eyebrow">Datos oficiales · Banco Central</span><h1>Las tasas, claras.<br /><em>Las condiciones, también.</em></h1><p>Encontrá la mayor tasa publicada dentro de ofertas comparables. Sin mezclar bases ni ocultar cuándo se descargó la información.</p></div><BankRateComparator /></div>; }
