import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { NewsFeed } from '@/components/features/news-feed';
import { PriceTicker } from '@/components/features/price-ticker';
export default function HomePage() {
  return <div className="home-dashboard">
    <section className="brand-hero dashboard-hero"><div className="hero-grid-texture" aria-hidden="true" /><div className="brand-hero-content"><h1 className="sr-only">INFVER · Información de inversiones</h1><Logo hero /><p className="hero-motto">No pongas todos los huevos en la misma <em>canasta.</em></p></div></section>
    <div className="page-shell dashboard-content"><PriceTicker /><NewsFeed compact /><Link className="investment-prompt" href="/simulador"><div><span>Tu próximo paso</span><h2>¿Cuánto tenemos para invertir hoy?</h2><p>Tu monto. Tu perfil. Un plan para distribuirlo.</p></div><ArrowUpRight size={26} /></Link></div>
  </div>;
}
