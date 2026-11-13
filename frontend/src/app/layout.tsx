import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/features/navigation';
import { Logo } from '@/components/ui/logo';
import './globals.css';
import './intelligence.css';
import './dashboard.css';
export const metadata: Metadata = {
  title: { default: 'INFVER · Información de inversiones', template: '%s · INFVER' },
  description: 'No pongas todos los huevos en la misma canasta. Noticias, alertas, tasas oficiales y educación para entender tus inversiones.',
  icons: { icon: '/infver-logo.svg', apple: '/infver-logo.svg' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-AR"><body><a href="#main" className="skip-link">Saltar al contenido</a><Navigation /><main id="main">{children}</main><footer className="site-footer"><div><Link href="/" className="footer-brand" aria-label="INFVER, inicio"><Logo /></Link><p>Más información. Mejores decisiones.</p></div><p>Herramienta educativa. Las inversiones pueden perder valor.<br />Cada sección identifica su fuente, cobertura y fecha de descarga.<br /><Link href="/fuentes" className="text-link">Fuentes, metodología y condiciones de uso</Link></p><span>No todos los huevos en la misma canasta.</span></footer></body></html>;
}
