'use client';
import { useEffect, useState } from 'react';
import { investmentApi } from '@/services/investment.service';
import { preferences } from '@/services/preferences.service';
import type { ProfileResult, Question } from '@/types/api';
export function useProfile() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<ProfileResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setError(''); setLoading(true);
    investmentApi.questions(controller.signal).then(items => { if (!controller.signal.aborted) setQuestions(items); }).catch((error: unknown) => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Error al cargar el test.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  async function submit() {
    setSubmitting(true); setError('');
    try { const response = await investmentApi.evaluate(questions.map(question => ({ questionId: question.id, optionId: answers[question.id] ?? '' }))); preferences.saveProfile(response.profile); setResult(response); }
    catch (error) { setError(error instanceof Error ? error.message : 'No pudimos calcular tu perfil.'); }
    finally { setSubmitting(false); }
  }
  return { questions, answers, step, setStep, result, loading, submitting, error, submit, answer: (questionId: string, optionId: string) => setAnswers(current => ({ ...current, [questionId]: optionId })), restart: () => { setAnswers({}); setResult(null); setStep(0); setError(''); }, retry: () => setAttempt(value => value + 1) };
}
