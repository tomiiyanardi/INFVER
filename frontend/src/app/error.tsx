'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <div className="page-shell inner-page"><h1>No pudimos mostrar esta página.</h1><p>Intentá cargarla otra vez.</p><Button onClick={reset}>Reintentar</Button></div>; }
