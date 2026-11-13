'use client';
import { Search } from 'lucide-react';
import { useCatalog } from '@/hooks/use-catalog';
import { AssetCard } from './asset-card';
import { Button } from '@/components/ui/button';
import { ErrorMessage, Loading } from '@/components/ui/feedback';
export function AssetExplorer() {
  const catalog = useCatalog();
  return <><div className="explorer-toolbar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar activo</span><input placeholder="Buscar por nombre o símbolo…" value={catalog.search} onChange={event => catalog.setSearch(event.target.value)} /></label><span className="muted">{catalog.assets.length} instrumentos</span></div><div className="filter-tabs" aria-label="Filtrar por categoría"><button aria-pressed={catalog.category === 'all'} onClick={() => catalog.setCategory('all')}>Todos</button>{catalog.categories.map(category => <button key={category.id} aria-pressed={catalog.category === category.id} onClick={() => catalog.setCategory(category.id)}><span className="color-dot" style={{ background: category.color }} />{category.name}</button>)}</div><ErrorMessage message={catalog.error} />{catalog.error && <Button variant="secondary" onClick={catalog.retry}>Reintentar</Button>}{catalog.loading ? <Loading text="Buscando oportunidades…" /> : !catalog.error && (catalog.assets.length ? <div className="asset-grid">{catalog.assets.map(asset => <AssetCard key={asset.id} asset={asset} />)}</div> : <div className="empty-state">No hay instrumentos con esos filtros. Probá con otro nombre.</div>)}</>;
}
