'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useScrollHeader } from '@/hooks/use-scroll-header';
import { Logo } from '@/components/ui/logo';
const links = [{ href: '/', label: 'Inicio' }, { href: '/mercado', label: 'Mercado' }, { href: '/inversiones', label: 'Activos' }, { href: '/plazos-fijos', label: 'Plazos fijos' }, { href: '/perfil', label: 'Tu perfil' }];
export function Navigation() {
  const pathname = usePathname();
  const scrolled = useScrollHeader();
  const [open, setOpen] = useState(false);
  return <header className={`site-header adaptive-header ${scrolled ? 'header-floating' : ''} ${pathname === '/' ? 'header-home' : ''}`}><div className="header-inner">
    <Link href="/" className="brand" aria-label="INFVER, inicio" onClick={() => setOpen(false)}><Logo /></Link>
    <button type="button" className="menu-toggle" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(value => !value)}>{open ? <X size={21} /> : <Menu size={21} />}</button>
    <nav id="main-navigation" aria-label="Navegación principal" className={open ? 'nav-open' : ''}>{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} aria-current={pathname === link.href ? 'page' : undefined} className={pathname === link.href ? 'active' : ''}>{link.label}</Link>)}<Link href="/simulador" className="nav-cta" onClick={() => setOpen(false)}>Mi cartera <ArrowUpRight size={15} /></Link></nav>
  </div></header>;
}
