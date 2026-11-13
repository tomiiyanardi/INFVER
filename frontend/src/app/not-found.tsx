import Link from 'next/link';
export default function NotFound() { return <div className="page-shell inner-page"><span className="eyebrow">404</span><h1>Este camino no existe.</h1><p>Volvé al inicio para seguir explorando.</p><Link className="button button-primary" href="/">Volver al inicio</Link></div>; }
