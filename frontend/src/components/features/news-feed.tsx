'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Radio, RefreshCw } from 'lucide-react';
import { useFeed } from '@/hooks/use-feed';
import { intelligenceApi } from '@/services/intelligence.service';
import { Button } from '@/components/ui/button';
import { ErrorMessage, Loading } from '@/components/ui/feedback';
import { FeedStatus, argentinaTime } from './feed-status';
export function NewsFeed({ compact = false }: { compact?: boolean }) {
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  useEffect(() => { try { if (localStorage.getItem('infver.news-language') === 'en') setLanguage('en'); } catch {} }, []);
  const load = useCallback((signal?: AbortSignal) => intelligenceApi.newsInLanguage(language, signal), [language]);
  const { data, loading, error, retry } = useFeed(load);
  const articles = data?.items.slice(0, compact ? 6 : 40) ?? [];
  function chooseLanguage(value: 'es' | 'en') { setLanguage(value); try { localStorage.setItem('infver.news-language', value); } catch {} }
  return <section className="news-section tiled-news" id="noticias"><div className="section-heading"><div><h2>En el radar</h2><p className="news-subtitle">Actualidad financiera · Más recientes primero</p></div><div className="news-controls"><div className="segmented" role="group" aria-label="Idioma de las noticias"><button type="button" aria-pressed={language === 'es'} onClick={() => chooseLanguage('es')}>Español</button><button type="button" aria-pressed={language === 'en'} onClick={() => chooseLanguage('en')}>English</button></div>{compact ? <Link href="/mercado" className="text-link">Ver todas <ArrowRight size={16} /></Link> : <Button variant="ghost" onClick={retry}><RefreshCw size={14} />Actualizar</Button>}</div></div>
    <ErrorMessage message={error} />{loading && <Loading text="Consultando noticias…" />}
    {articles.length > 0 ? <div className="news-grid">{articles.map(article => <article className="news-item" key={article.id} lang={language}><div className="news-item-meta"><span>{article.topics[0]}</span><small>{language === 'es' ? 'ES' : 'EN'}</small></div><a href={article.url} target="_blank" rel="noreferrer"><h3>{article.title}</h3><ArrowUpRight size={18} /></a><div className="news-item-source"><strong>{article.publisher}</strong><time dateTime={article.indexedAt}>{article.dateKind === 'published' ? 'Publicada' : 'Indexada'} {argentinaTime(article.indexedAt)}</time></div></article>)}</div> : !loading && <div className="intelligence-empty"><Radio size={26} /><h3>No hay noticias disponibles en {language === 'es' ? 'español' : 'inglés'}.</h3><p>{data?.message ?? 'No pudimos consultar las fuentes.'}</p><Button variant="secondary" onClick={retry}>Consultar de nuevo</Button></div>}
    {data && <details className="source-details"><summary>Fuentes y actualización</summary><FeedStatus feed={data} /><p className="source-disclosure">{data.source.coverage} Idioma original; no es traducción automática. Selección temática por fecha, sin clasificación automática de importancia. Caché de 15 minutos.</p></details>}
  </section>;
}
