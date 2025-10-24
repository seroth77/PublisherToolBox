import React, { useMemo, useState } from 'react'
import './ContentGrid.css'
import ContentCard from './ContentCard'
import FilterControls from './FilterControls'

const normalize = (s) => (s === undefined || s === null ? '' : String(s))

export default function ContentGrid({ items = [] }) {
  const [search, setSearch] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState([])
  const [selectedCountries, setSelectedCountries] = useState([])
  const [paidContentFilter, setPaidContentFilter] = useState('all')
  const [sortOption, setSortOption] = useState('nameAsc')

  // De-duplicate items by channel name (keep first occurrence)
  const deduplicatedItems = useMemo(() => {
    const seen = new Set()
    return items.filter(it => {
      const channelName = normalize(it['What is the name of your channel?']).toLowerCase().trim()
      if (!channelName || seen.has(channelName)) {
        return false
      }
      seen.add(channelName)
      return true
    })
  }, [items])

  const platforms = useMemo(() => {
    const s = new Set()
    deduplicatedItems.forEach(it => {
      normalize(it['What platform is your channel on?']).split(';').forEach(p => { const t = p.trim(); if (t) s.add(t) })
    })
    return Array.from(s).sort()
  }, [deduplicatedItems])

  const countries = useMemo(() => {
    const s = new Set()
    deduplicatedItems.forEach(it => {
      const c = normalize(it['What country are located in?']).trim()
      if (c) s.add(c)
    })
    return Array.from(s).sort()
  }, [deduplicatedItems])

  const filtered = useMemo(() => {
    console.log('Filtering grid items:', {
      total: deduplicatedItems.length,
      searchQuery: search,
      selectedPlatforms,
      selectedCountries,
      paidContentFilter
    })
    const q = search.trim().toLowerCase()
    return deduplicatedItems.filter(it => {
      if (q) {
        const hay = (
          normalize(it['What is your name?']) + ' ' +
          normalize(it['What is the name of your channel?']) + ' ' +
          normalize(it['What are your top 10 favorite games?']) + ' ' +
          normalize(it['What type of content do you prefer to cover?'])
        ).toLowerCase()
        if (!hay.includes(q)) return false
      }

      if (selectedPlatforms.length) {
        const raw = normalize(it['What platform is your channel on?']).toLowerCase()
        const has = selectedPlatforms.every(sp => raw.includes(sp.toLowerCase()))
        if (!has) return false
      }

      if (selectedCountries.length) {
        const c = normalize(it['What country are located in?']).toLowerCase()
        const ok = selectedCountries.some(sc => sc.toLowerCase() === c)
        if (!ok) return false
      }

      if (paidContentFilter === 'free') {
        if (normalize(it['Do you charge for content?']).toLowerCase().includes('yes')) return false
      } else if (paidContentFilter === 'paid') {
        if (!normalize(it['Do you charge for content?']).toLowerCase().includes('yes')) return false
      }

      return true
    })
  }, [deduplicatedItems, search, selectedPlatforms, selectedCountries, paidContentFilter])

  const sorted = useMemo(() => {
    const out = [...filtered]
    switch (sortOption) {
      case 'nameAsc': out.sort((a,b) => normalize(a['What is the name of your channel?']).localeCompare(normalize(b['What is the name of your channel?']))); break
      case 'nameDesc': out.sort((a,b) => normalize(b['What is the name of your channel?']).localeCompare(normalize(a['What is the name of your channel?']))); break
      case 'country': out.sort((a,b) => normalize(a['What country are located in?']).localeCompare(normalize(b['What country are located in?']))); break
      case 'platformCount': out.sort((a,b) => {
        const pa = normalize(a['What platform is your channel on?']).split(';').filter(Boolean).length
        const pb = normalize(b['What platform is your channel on?']).split(';').filter(Boolean).length
        return pb - pa
      }); break
      default: break
    }
    return out
  }, [filtered, sortOption])

  function togglePlatform(p) { setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]) }
  function toggleCountry(c) { setSelectedCountries(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]) }
  function clearFilters() { setSearch(''); setSelectedPlatforms([]); setSelectedCountries([]); setPaidContentFilter('all'); setSortOption('nameAsc') }

  function slugify(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  return (
    <div className="content-grid-root">
      <FilterControls
        search={search}
        onSearchChange={setSearch}
        platforms={platforms}
        countries={countries}
        selectedPlatforms={selectedPlatforms}
        selectedCountries={selectedCountries}
        paidContentFilter={paidContentFilter}
        sortOption={sortOption}
        onPlatformToggle={togglePlatform}
        onCountryToggle={toggleCountry}
        onPaidContentChange={setPaidContentFilter}
        onSortChange={setSortOption}
        onClearFilters={clearFilters}
        totalResults={deduplicatedItems.length}
        filteredCount={sorted.length}
      />

      <div className="content-grid">
        {sorted.map((it, idx) => {
          // Build a stable unique key: slug(channelName) - timestamp - index
          const channelName = it['What is the name of your channel?'] || it['What is your name?'] || ''
          const ts = it.Timestamp || ''
          const key = `${slugify(channelName)}-${slugify(ts)}-${idx}`
          return <ContentCard key={key} data={it} />
        })}
        {sorted.length === 0 && <div className="no-results">No creators match the selected filters.</div>}
      </div>
    </div>
  )
}