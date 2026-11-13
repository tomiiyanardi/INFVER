'use client';
import { useEffect, useMemo, useState } from 'react';
import { investmentApi } from '@/services/investment.service';
import type { Asset, Category, CategoryId } from '@/types/api';
export function useCatalog() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    Promise.all([investmentApi.assets(undefined, controller.signal), investmentApi.categories(controller.signal)]).then(([items, groups]) => { if (!controller.signal.aborted) { setAssets(items); setCategories(groups); } }).catch((error: unknown) => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'No pudimos cargar el catálogo.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  const filteredAssets = useMemo(() => assets.filter(asset => (category === 'all' || asset.categoryId === category) && `${asset.name} ${asset.symbol}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))), [assets, category, search]);
  return { assets: filteredAssets, categories, category, setCategory, search, setSearch, loading, error, retry: () => setAttempt(value => value + 1) };
}
