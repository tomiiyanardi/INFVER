import type { Metadata } from 'next';
import { ProfileWizard } from '@/components/features/profile-wizard';
export const metadata: Metadata = { title: 'Tu perfil inversor' };
export default function ProfilePage() { return <div className="page-shell inner-page narrow-page"><div className="page-intro"><span className="eyebrow">El mejor punto de partida sos vos</span><h1>Cada persona,<br /><em>su propio equilibrio.</em></h1><p>Seis preguntas para entender tus objetivos, tus tiempos y tu relación con el riesgo. Respondé pensando en tu situación actual.</p></div><ProfileWizard /><p className="under-note">Este test es orientativo. Revisá tu perfil cuando cambien tus objetivos o tu situación financiera.</p></div>; }
