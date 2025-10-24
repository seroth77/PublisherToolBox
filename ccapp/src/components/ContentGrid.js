import React, { useEffect, useMemo, useState } from 'react'
import './ContentGrid.css'
import ContentCard from './ContentCard'
import FilterControls from './FilterControls'
import { extractChannelIdFromUrl, fetchChannelLogo, resolveHandleOrQuery } from '../utils/channel'

const normalize = (s) => (s === undefined || s === null ? '' : String(s))
const splitPlatforms = (raw) =>
  normalize(raw)
    .split(/[;,&]/)
    .map(p => p.trim())
    .filter(Boolean)
const titleCase = (s) => s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

// Canonical platform labels (case-insensitive keys)
const PLATFORM_LABELS = new Map([
  ['youtube', 'YouTube'],
  ['you tube', 'YouTube'],
  ['yt', 'YouTube'],
  ['instagram', 'Instagram'],
  ['ig', 'Instagram'],
  ['website', 'Website'],
  ['site', 'Website'],
  ['web site', 'Website'],
  ['web', 'Website'],
  ['www', 'Website'],
  ['blog', 'Blog'],
  ['blog/website', 'Website'],
  ['tiktok', 'TikTok'],
  ['tik tok', 'TikTok'],
  ['twitch', 'Twitch'],
  ['facebook', 'Facebook'],
  ['fb', 'Facebook'],
  ['twitter', 'X (Twitter)'],
  ['x', 'X (Twitter)'],
  ['x (twitter)', 'X (Twitter)'],
  ['twitter/x', 'X (Twitter)'],
  ['threads', 'Threads'],
  ['reddit', 'Reddit'],
  ['podcast', 'Podcast'],
  ['newsletter', 'Newsletter'],
  ['boardgamegeek', 'BoardGameGeek'],
  ['board game geek', 'BoardGameGeek'],
  ['bgg', 'BoardGameGeek']
])

const canonicalizePlatform = (p) => {
  const key = String(p || '').trim().toLowerCase()
  return PLATFORM_LABELS.get(key) || titleCase(p)
}

const canonicalKey = (p) => canonicalizePlatform(p).toLowerCase()

// ---- Country canonicalization ----
const toCountryKey = (s) => normalize(s)
  .toLowerCase()
  .replace(/[.()]/g, '')
  .replace(/&/g, 'and')
  .replace(/[^a-z\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const COUNTRY_LABELS = new Map([
  // United States
  ['us', 'United States'],
  ['usa', 'United States'],
  ['u s', 'United States'],
  ['u s a', 'United States'],
  ['united states', 'United States'],
  ['united states of america', 'United States'],
  // United Kingdom
  ['uk', 'United Kingdom'],
  ['u k', 'United Kingdom'],
  ['united kingdom', 'United Kingdom'],
  ['great britain', 'United Kingdom'],
  ['gb', 'United Kingdom'],
  // Netherlands
  ['netherlands', 'Netherlands'],
  ['the netherlands', 'Netherlands'],
  ['holland', 'Netherlands'],
  ['nl', 'Netherlands'],
  // Czechia
  ['czech', 'Czechia'],
  ['czech republic', 'Czechia'],
  ['czechia', 'Czechia'],
  // South Korea
  ['south korea', 'South Korea'],
  ['republic of korea', 'South Korea'],
  ['korea republic of', 'South Korea'],
  // UAE
  ['uae', 'United Arab Emirates'],
  ['u a e', 'United Arab Emirates'],
  ['united arab emirates', 'United Arab Emirates'],
  // Other common
  ['viet nam', 'Vietnam'],
  ['cote d ivoire', "Côte d'Ivoire"],
])

const canonicalizeCountry = (c) => {
  const key = toCountryKey(c)
  if (!key) return ''
  return COUNTRY_LABELS.get(key) || titleCase(c.toString().trim())
}

const canonicalCountryKey = (c) => canonicalizeCountry(c).toLowerCase()

export default function ContentGrid({ items = [] }) {
  const [search, setSearch] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState([])
  const [selectedCountries, setSelectedCountries] = useState([])
  const [paidContentFilter, setPaidContentFilter] = useState('all')
  const [sortOption, setSortOption] = useState('nameAsc')
  const [subscriberMap, setSubscriberMap] = useState({}) // key: channelNameLower -> { count:number|null }
  const [designerView, setDesignerView] = useState(false)

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
    // Deduplicate with canonical labels
    const map = new Map() // canonicalLower -> display label
    deduplicatedItems.forEach(it => {
      splitPlatforms(it['What platform is your channel on?']).forEach(p => {
        const key = canonicalKey(p)
        if (!map.has(key)) {
          map.set(key, canonicalizePlatform(p))
        }
      })
    })
    return Array.from(map.values()).sort()
  }, [deduplicatedItems])

  const countries = useMemo(() => {
    // Deduplicate using canonical country labels
    const map = new Map() // canonicalLower -> display label
    deduplicatedItems.forEach(it => {
      const raw = it['What country are located in?']
      const label = canonicalizeCountry(raw)
      const key = label.toLowerCase()
      if (label && !map.has(key)) map.set(key, label)
    })
    return Array.from(map.values()).sort()
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
        const tokens = new Set(splitPlatforms(it['What platform is your channel on?']).map(canonicalKey))
        const selected = selectedPlatforms.map(canonicalKey)
        const has = selected.every(sp => tokens.has(sp))
        if (!has) return false
      }

      if (selectedCountries.length) {
        const itemC = canonicalCountryKey(it['What country are located in?'])
        const ok = selectedCountries.some(sc => sc && sc.toLowerCase() === itemC)
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

  // When designer view is turned off, reset content-type filter to default
  useEffect(() => {
    if (!designerView && paidContentFilter !== 'all') {
      setPaidContentFilter('all')
    }
  }, [designerView, paidContentFilter])

  // Prefetch subscriber counts for YouTube channels to support subscriber sorting
  useEffect(() => {
    let cancelled = false
    async function prefetch() {
      const updates = {}
      const tasks = []
      for (const it of deduplicatedItems) {
        const channelName = normalize(it['What is the name of your channel?']).trim()
        if (!channelName) continue
        const key = channelName.toLowerCase()
        if (subscriberMap[key] !== undefined) continue

        const link = String(it['What is the link to your channel(s)? (If you have multiple channels, add them all using commas to separate them.)'] || '').split(',')[0].trim()
        const platformsRaw = it['What platform is your channel on?'] || ''
        const isYouTube = link.toLowerCase().includes('youtube') || splitPlatforms(platformsRaw).some(p => canonicalKey(p) === 'youtube')
  if (!isYouTube) continue

        tasks.push((async () => {
          try {
            let count = null
            let hidden = false
            let channelIdOrHandle = extractChannelIdFromUrl(link) || extractChannelIdFromUrl(channelName)
            if (channelIdOrHandle && typeof channelIdOrHandle === 'string' && channelIdOrHandle.startsWith('@')) {
              channelIdOrHandle = channelIdOrHandle.substring(1)
            }
            if (!channelIdOrHandle && link.includes('@')) {
              const handle = link.split('@').pop().split(/[/?#]/)[0]
              const resolved = await resolveHandleOrQuery(handle)
              if (resolved) {
                count = resolved.subscriberCount ?? null
                hidden = resolved.hiddenSubscriberCount ?? false
              }
            } else if (!channelIdOrHandle && isYouTube) {
              // Fallback: try resolving by channel name when platform indicates YouTube
              const resolvedByName = await resolveHandleOrQuery(channelName)
              if (resolvedByName) {
                // After resolving by name, fetch full info by channelId to get statistics
                const cid = resolvedByName.channelId || null
                if (cid) {
                  const info = await fetchChannelLogo(cid)
                  if (info) {
                    count = info.subscriberCount ?? null
                    hidden = info.hiddenSubscriberCount ?? false
                  }
                }
              }
            } else if (channelIdOrHandle) {
              const info = await fetchChannelLogo(channelIdOrHandle)
              if (info) {
                count = info.subscriberCount ?? null
                hidden = info.hiddenSubscriberCount ?? false
              }
            }
            updates[key] = { count: hidden ? null : (typeof count === 'number' ? count : null) }
          } catch (e) {
            updates[key] = { count: null }
          }
        })())
      }
      if (tasks.length) {
        await Promise.allSettled(tasks)
        if (!cancelled) setSubscriberMap(prev => ({ ...prev, ...updates }))
      }
    }
    prefetch()
    return () => { cancelled = true }
  }, [deduplicatedItems, subscriberMap])

  const sorted = useMemo(() => {
    const out = [...filtered]
    switch (sortOption) {
      case 'nameAsc': out.sort((a,b) => normalize(a['What is the name of your channel?']).localeCompare(normalize(b['What is the name of your channel?']))); break
      case 'nameDesc': out.sort((a,b) => normalize(b['What is the name of your channel?']).localeCompare(normalize(a['What is the name of your channel?']))); break
      case 'country': out.sort((a,b) => normalize(a['What country are located in?']).localeCompare(normalize(b['What country are located in?']))); break
      case 'platformCount': out.sort((a,b) => {
        const pa = new Set(splitPlatforms(a['What platform is your channel on?']).map(canonicalKey)).size
        const pb = new Set(splitPlatforms(b['What platform is your channel on?']).map(canonicalKey)).size
        return pb - pa
      }); break
      case 'subscribersDesc': out.sort((a,b) => {
        const ak = normalize(a['What is the name of your channel?']).toLowerCase().trim()
        const bk = normalize(b['What is the name of your channel?']).toLowerCase().trim()
        const av = subscriberMap[ak]?.count ?? 0
        const bv = subscriberMap[bk]?.count ?? 0
        return bv - av
      }); break
      default: break
    }
    return out
  }, [filtered, sortOption, subscriberMap])

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
        designerView={designerView}
        onPlatformToggle={togglePlatform}
        onCountryToggle={toggleCountry}
        onPaidContentChange={setPaidContentFilter}
        onSortChange={setSortOption}
        onDesignerViewChange={setDesignerView}
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
          return <ContentCard key={key} data={it} designerView={designerView} />
        })}
        {sorted.length === 0 && <div className="no-results">No creators match the selected filters.</div>}
      </div>
    </div>
  )
}