'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useCatalog } from '@/hooks/use-catalog';
import { DistributionChart } from './distribution-chart';
import { ErrorMessage, Loading } from '@/components/ui/feedback';
const demoWeights = [10, 20, 20, 30, 20];
export function HomeOverview() {
  const { categories, loading, error, retry } = useCatalog();
  return <div className="hero-portfolio"><div className="section-heading"><span className="eyebrow">Una mirada a tu futuro</span><span className="live-dot">Ejemplo ilustrativo</span></div><div className="hero-portfolio-heading"><h2>Equilibrio que se construye.</h2><span>Distribución de ejemplo · perfil moderado</span></div>{loading ? <Loading /> : error ? <><ErrorMessage message={error} /><button className="text-link" onClick={retry}>Reintentar</button></> : <DistributionChart allocations={categories.map((category, index) => ({ ...category, percentage: demoWeights[index] ?? 0 }))} />}<div className="portfolio-footnote"><span>Cinco categorías. Más perspectiva.</span><Link href="/simulador" aria-label="Ir al simulador"><ArrowUpRight size={20} /></Link></div></div>;
}
