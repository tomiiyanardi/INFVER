import type { Metadata } from 'next';
import { AssetExplorer } from '@/components/features/asset-explorer';
export const metadata: Metadata = { title: 'Explorador de inversiones' };
export default function InvestmentsPage() { return <div className="page-shell inner-page"><div className="page-intro"><span className="eyebrow">Entendé antes de elegir</span><h1>Un mundo de opciones.<br /><em>Una mirada informada.</em></h1><p>Explorá instrumentos, compará riesgos y conocé los factores que mueven cada inversión. Tasas y escenarios ilustrativos, no cotizaciones actuales.</p></div><AssetExplorer /></div>; }
