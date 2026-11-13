'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorMessage, Loading } from '@/components/ui/feedback';
export function ProfileWizard() {
  const wizard = useProfile();
  if (wizard.loading) return <Loading text="Preparando tu test…" />;
  if (wizard.result) return <Card className="profile-result"><span className="result-icon"><ShieldCheck size={34} /></span><Badge tone="green">Tu punto de partida</Badge><h2>Tu perfil es {wizard.result.name.toLowerCase()}.</h2><p>{wizard.result.description}</p><span className="muted">Puntaje: {wizard.result.score} de {wizard.result.maxScore}. La capacidad financiera puede limitar el perfil.</span><div className="actions"><Link href="/simulador" className="button button-primary">Armar mi cartera <ArrowRight size={18} /></Link><Button variant="secondary" onClick={wizard.restart}>Volver a hacer el test</Button></div></Card>;
  const question = wizard.questions[wizard.step];
  if (!question) return <><ErrorMessage message={wizard.error || 'El cuestionario no está disponible.'} /><Button onClick={wizard.retry}>Reintentar</Button></>;
  const isLast = wizard.step === wizard.questions.length - 1;
  return <Card className="wizard"><div className="wizard-meta"><span>Pregunta {wizard.step + 1} de {wizard.questions.length}</span><span>{Math.round((wizard.step + 1) / wizard.questions.length * 100)}%</span></div><div className="progress-track" role="progressbar" aria-label="Avance del cuestionario" aria-valuemin={0} aria-valuemax={wizard.questions.length} aria-valuenow={wizard.step + 1}><span style={{ width: `${(wizard.step + 1) / wizard.questions.length * 100}%` }} /></div><fieldset><legend>{question.title}</legend><div className="answer-options">{question.options.map((option, index) => <label key={option.id} className={wizard.answers[question.id] === option.id ? 'answer selected' : 'answer'}><input type="radio" name={question.id} value={option.id} checked={wizard.answers[question.id] === option.id} onChange={() => wizard.answer(question.id, option.id)} /><span className="answer-letter">{String.fromCharCode(65 + index)}</span><span>{option.label}</span>{wizard.answers[question.id] === option.id && <Check size={18} />}</label>)}</div></fieldset><ErrorMessage message={wizard.error} /><div className="wizard-actions"><Button variant="ghost" disabled={wizard.step === 0 || wizard.submitting} onClick={() => wizard.setStep(step => step - 1)}><ArrowLeft size={16} />Anterior</Button><Button disabled={!wizard.answers[question.id] || wizard.submitting} onClick={() => isLast ? void wizard.submit() : wizard.setStep(step => step + 1)}>{wizard.submitting ? 'Calculando…' : isLast ? 'Conocer mi perfil' : 'Continuar'}<ArrowRight size={16} /></Button></div></Card>;
}
