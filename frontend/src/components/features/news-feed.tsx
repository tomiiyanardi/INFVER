'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Radio, RefreshCw } from 'lucide-react';
import { useFeed } from '@/hooks/use-feed';
import { intelligenceApi } from '@/services/intelligence.service';
import { rankNews, relativeTime } from '@/services/news-ranking';
import { Button } from '@/components/ui/button';
import { ErrorMessage, Loading } from '@/components/ui/feedback';
import { FeedStatus, argentinaTime } from './feed-status';
import type { NewsArticle } from '@/types/intelligence';

const ROTATION_MS = 7_000;
const FEATURED = 5;

/** Imagen de portada del medio, enlazada desde su origen. Si falla, se muestra un fondo con el nombre del medio. */
function NewsImage({ article, eager = false }: { article: NewsArticle; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!article.image || failed) return <div className="news-image news-image-fallback" data-topic={article.topics[0] ?? 'Mercados'} aria-hidden="true"><span>{article.publisher}</span></div>;
  // eslint-disable-next-line @next/next/no-img-element -- imágenes externas de dominios variables: no pasan por el optimizador de Next.
  return <img className="news-image" src={article.image} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

function Meta({ article }: { article: NewsArticle }) {
  return <div className="news-meta"><span className="news-topic">{article.topics[0]}</span><strong>{article.publisher}</strong><time dateTime={article.indexedAt} title={`${article.dateKind === 'published' ? 'Publicada' : 'Indexada'} ${argentinaTime(article.indexedAt)} (AR)`}>{relativeTime(article.indexedAt)}</time></div>;
}

/** Nota principal: rota entre las más relevantes. Se detiene al pasar el mouse, al enfocar o con "reducir movimiento". */
function LeadStory({ items }: { items: NewsArticle[] }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [stopped, setStopped] = useState(false);
  useEffect(() => { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setStopped(true); }, []);
  const running = !hovered && !stopped && items.length > 1;
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setIndex(value => (value + 1) % items.length), ROTATION_MS);
    return () => clearTimeout(timer);
  }, [running, index, items.length]);
  const active = Math.min(index, items.length - 1);
  const go = (step: number) => setIndex(value => (value + step + items.length) % items.length);
  return <div className="news-lead" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setHovered(true)} onBlur={() => setHovered(false)} aria-roledescription="carrusel" aria-label="Noticias destacadas">
    {items.map((article, position) => <article key={article.id} className={`news-lead-slide ${position === active ? 'is-active' : ''}`} aria-hidden={position !== active} aria-roledescription="diapositiva" aria-label={`${position + 1} de ${items.length}`}>
      <NewsImage article={article} eager={position === 0} />
      <div className="news-lead-body">
        <span className="news-lead-kicker">Destacada</span>
        <a href={article.url} target="_blank" rel="noreferrer" tabIndex={position === active ? 0 : -1}><h3>{article.title}</h3></a>
        <Meta article={article} />
      </div>
    </article>)}
    {items.length > 1 && <div className="news-lead-controls">
      <button type="button" onClick={() => go(-1)} aria-label="Noticia anterior"><ChevronLeft size={16} /></button>
      <div className="news-lead-dots">{items.map((article, position) => <button type="button" key={article.id} className={position === active ? 'is-active' : ''} onClick={() => setIndex(position)} aria-label={`Ver noticia ${position + 1}`} aria-current={position === active ? 'true' : undefined}>{position === active && running && <span key={active} className="news-lead-progress" style={{ animationDuration: `${ROTATION_MS}ms` }} />}</button>)}</div>
      <button type="button" onClick={() => go(1)} aria-label="Noticia siguiente"><ChevronRight size={16} /></button>
      <button type="button" onClick={() => setStopped(value => !value)} aria-pressed={stopped} aria-label={stopped ? 'Reanudar rotación' : 'Detener rotación'}>{stopped ? <Play size={14} /> : <Pause size={14} />}</button>
    </div>}
  </div>;
}

function NewsTile({ article, variant }: { article: NewsArticle; variant: 'side' | 'strip' | 'list' }) {
  return <article className={`news-tile news-tile-${variant}`} lang={article.language === 'Spanish' ? 'es' : article.language === 'English' ? 'en' : undefined}>
    <a href={article.url} target="_blank" rel="noreferrer">
      <NewsImage article={article} />
      <div className="news-tile-body"><h3>{article.title}</h3><Meta article={article} /></div>
    </a>
  </article>;
}

export function NewsFeed({ compact = false }: { compact?: boolean }) {
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  useEffect(() => { try { if (localStorage.getItem('infver.news-language') === 'en') setLanguage('en'); } catch {} }, []);
  const load = useCallback((signal?: AbortSignal) => intelligenceApi.newsInLanguage(language, signal), [language]);
  const { data, loading, error, retry } = useFeed(load);
  const ranked = useMemo(() => rankNews(data?.items ?? []), [data]);
  const featured = ranked.slice(0, FEATURED);
  const side = ranked.slice(FEATURED, FEATURED + 4);
  const strip = ranked.slice(FEATURED + 4, FEATURED + 8);
  const more = compact ? [] : ranked.slice(FEATURED + 8, 48);
  function chooseLanguage(value: 'es' | 'en') { setLanguage(value); try { localStorage.setItem('infver.news-language', value); } catch {} }
  return <section className="news-section newsroom" id="noticias">
    <div className="section-heading"><div><h2>En el radar</h2><p className="news-subtitle">Actualidad financiera · Destacadas por relevancia y recencia</p></div><div className="news-controls"><div className="segmented" role="group" aria-label="Idioma de las noticias"><button type="button" aria-pressed={language === 'es'} onClick={() => chooseLanguage('es')}>Español</button><button type="button" aria-pressed={language === 'en'} onClick={() => chooseLanguage('en')}>English</button></div>{compact ? <Link href="/mercado#noticias" className="text-link">Ver todas <ArrowRight size={16} /></Link> : <Button variant="ghost" onClick={retry}><RefreshCw size={14} />Actualizar</Button>}</div></div>
    <ErrorMessage message={error} />{loading && <Loading text="Consultando noticias…" />}
    {featured.length > 0 ? <>
      <div className="news-puzzle" lang={language}>
        <LeadStory key={`${language}-${featured.map(article => article.id).join()}`} items={featured} />
        {side.map(article => <NewsTile key={article.id} article={article} variant="side" />)}
        {strip.map(article => <NewsTile key={article.id} article={article} variant="strip" />)}
      </div>
      {more.length > 0 && <div className="news-more" lang={language}>{more.map(article => <NewsTile key={article.id} article={article} variant="list" />)}</div>}
    </> : !loading && <div className="intelligence-empty"><Radio size={26} /><h3>No hay noticias disponibles en {language === 'es' ? 'español' : 'inglés'}.</h3><p>{data?.message ?? 'No pudimos consultar las fuentes.'}</p><Button variant="secondary" onClick={retry}>Consultar de nuevo</Button></div>}
    {data && <details className="source-details"><summary>Fuentes y actualización</summary><FeedStatus feed={data} /><p className="source-disclosure">{data.source.coverage} Titulares en idioma original; no es traducción automática. Las imágenes son las que cada medio publica para compartir su nota y se muestran enlazadas desde su sitio. Caché de 15 minutos.</p></details>}
  </section>;
}
