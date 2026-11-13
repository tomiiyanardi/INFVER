import type { Metadata } from 'next';
import { NewsFeed } from '@/components/features/news-feed';
import { MarketAlerts } from '@/components/features/market-alerts';
import { EconomicCalendar } from '@/components/features/economic-calendar';
export const metadata: Metadata = { title: 'Panorama de mercado' };
export default function MarketPage() { return <div className="page-shell inner-page market-page"><div className="page-intro"><span className="eyebrow">Información de inversiones</span><h1>Todo el contexto.<br /><em>En un mismo lugar.</em></h1><p>Movimientos de precio, agenda económica y referencias de noticias. Cada dato con su fuente y su momento; cada señal con sus límites.</p></div><div className="market-jump-links"><a href="#alertas">Movimientos de mercado</a><a href="#agenda">Agenda y archivo</a><a href="#noticias">Noticias</a></div><div id="alertas"><MarketAlerts /></div><div id="agenda"><EconomicCalendar /></div><NewsFeed /></div>; }
