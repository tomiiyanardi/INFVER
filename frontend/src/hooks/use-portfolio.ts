'use client';
import { useEffect, useRef, useState } from 'react';
import { investmentApi } from '@/services/investment.service';
import { preferences } from '@/services/preferences.service';
import type { Currency, Portfolio, ProfileId, Recommendation } from '@/types/api';
export function usePortfolio() {
  const [amount, setAmount] = useState('1000000');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [profile, setProfile] = useState<ProfileId>('moderate');
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [message, setMessage] = useState('');
  const generation = useRef(0);
  async function refresh() { try { setPortfolios(await investmentApi.portfolios()); setListError(''); } catch (error) { setListError(error instanceof Error ? error.message : 'No pudimos cargar las carteras.'); } }
  useEffect(() => { const stored = preferences.readProfile(); if (stored) setProfile(stored); void refresh(); }, []);
  const invalidate = () => { generation.current += 1; setRecommendation(null); setError(''); setMessage(''); setLoading(false); };
  async function simulate() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0.01 || value > 1_000_000_000 || Math.abs(value * 100 - Math.round(value * 100)) > 0.0001) { setError('Ingresá un monto entre 0,01 y 1.000.000.000, con hasta dos decimales.'); return; }
    const current = ++generation.current; setLoading(true); setError(''); setMessage('');
    try { const result = await investmentApi.recommend({ amount: value, currency, profile }); if (generation.current === current) setRecommendation(result); }
    catch (error) { if (generation.current === current) setError(error instanceof Error ? error.message : 'No pudimos simular.'); }
    finally { if (generation.current === current) setLoading(false); }
  }
  async function save(name: string) {
    if (!recommendation || !name.trim()) { setError('Escribí un nombre para guardar la cartera.'); return; }
    setSaving(true); setError(''); setMessage('');
    try { const saved = await investmentApi.savePortfolio({ name: name.trim(), amount: recommendation.amount, currency: recommendation.currency, profile: recommendation.profile }); setMessage('Cartera guardada durante esta sesión del servidor.'); setPortfolios(current => [saved, ...current]); }
    catch (error) { setError(error instanceof Error ? error.message : 'No pudimos guardar.'); }
    finally { setSaving(false); }
  }
  async function remove(id: string) { try { await investmentApi.deletePortfolio(id); setPortfolios(current => current.filter(item => item.id !== id)); setListError(''); } catch (error) { setListError(error instanceof Error ? error.message : 'No pudimos eliminar.'); } }
  return { amount, currency, profile, recommendation, portfolios, loading, saving, error, listError, message, simulate, save, remove, refresh,
    changeAmount: (value: string) => { invalidate(); setAmount(value); }, changeCurrency: (value: Currency) => { invalidate(); setCurrency(value); }, changeProfile: (value: ProfileId) => { invalidate(); setProfile(value); },
    open: (portfolio: Portfolio) => { invalidate(); setAmount(String(portfolio.amount)); setCurrency(portfolio.currency); setProfile(portfolio.profile); setRecommendation(portfolio); },
  };
}
