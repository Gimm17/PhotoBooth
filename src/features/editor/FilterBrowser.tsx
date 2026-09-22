import { FILTER_PRESETS } from '../../catalog/filters'
import type { FilterCategory } from '../../catalog/types'

const categories: Array<{ label: string; value: FilterCategory | 'all' }> = [
  { label: 'Semua', value: 'all' }, { label: 'Natural', value: 'natural' }, { label: 'Film', value: 'film' }, { label: 'Mono', value: 'mono' }, { label: 'Hangat', value: 'warm' }, { label: 'Dingin', value: 'cool' }, { label: 'Kreatif', value: 'creative' },
]

interface FilterBrowserProps {
  category: FilterCategory | 'all'
  selectedFilter: string
  onCategoryChange: (category: FilterCategory | 'all') => void
  onSelect: (filterId: string) => void
}

export function FilterBrowser({ category, selectedFilter, onCategoryChange, onSelect }: FilterBrowserProps) {
  const filters = FILTER_PRESETS.filter((filter) => category === 'all' || filter.category === category)
  return <section className="editor-browser" aria-labelledby="filter-browser-heading">
    <div className="editor-browser-heading"><div><p className="editor-kicker">Warna</p><h2 id="filter-browser-heading">Filter</h2></div><span>{filters.length} pilihan</span></div>
    <div className="editor-chip-row" aria-label="Kategori filter">{categories.map((item) => <button key={item.value} className={category === item.value ? 'is-active' : ''} type="button" onClick={() => onCategoryChange(item.value)}>{item.label}</button>)}</div>
    <div className="filter-grid">{filters.map((filter) => <button key={filter.id} type="button" className={selectedFilter === filter.id ? 'is-selected' : ''} aria-pressed={selectedFilter === filter.id} onClick={() => onSelect(filter.id)}><i style={{ background: filter.previewColor }} /><span>{filter.name}</span></button>)}</div>
  </section>
}
