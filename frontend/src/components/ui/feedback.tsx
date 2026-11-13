import { AlertCircle, LoaderCircle } from 'lucide-react';
export function ErrorMessage({ message }: { message: string }) { return message ? <div role="alert" className="feedback error"><AlertCircle size={18} />{message}</div> : null; }
export function Loading({ text = 'Cargando…' }: { text?: string }) { return <div role="status" className="feedback"><LoaderCircle size={20} className="spinner" />{text}</div>; }
