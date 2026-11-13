import type { Metadata } from 'next';
import { PortfolioSimulator } from '@/components/features/portfolio-simulator';
export const metadata: Metadata = { title: 'Simulador de cartera' };
export default function SimulatorPage() { return <div className="page-shell inner-page"><div className="page-intro"><span className="eyebrow">No todos los huevos en la misma canasta</span><h1>Tu capital.<br /><em>Más de una posibilidad.</em></h1><p>Visualizá una distribución según tu perfil. Cada importe es una parte de tu presupuesto; no representa una orden de compra.</p></div><PortfolioSimulator /></div>; }
