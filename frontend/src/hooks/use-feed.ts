'use client';
import { useEffect, useState } from 'react';
export function useFeed<T>(load: (signal?: AbortSignal) => Promise<T>, intervalMs = 60_000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setData(null);
    setLoading(true);
    setError('');
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function refresh() {
      try { const response = await load(controller.signal); if (active) { setData(response); setError(''); } }
      catch (error) { if (active) setError(error instanceof Error ? error.message : 'No pudimos consultar la información.'); }
      finally { if (active) { setLoading(false); timer = setTimeout(() => void refresh(), intervalMs); } }
    }
    void refresh();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [load, intervalMs, attempt]);
  return { data, loading, error, retry: () => setAttempt(value => value + 1) };
}
