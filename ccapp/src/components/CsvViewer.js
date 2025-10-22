import React, { useEffect, useMemo, useState } from 'react'
import { parse } from 'papaparse'

function compare(a, b, asc = true) {
  if (a === b) return 0
  if (a === undefined || a === null) return asc ? -1 : 1
  if (b === undefined || b === null) return asc ? 1 : -1
  const an = a.toString().toLowerCase()
  const bn = b.toString().toLowerCase()
  if (an < bn) return asc ? -1 : 1
  if (an > bn) return asc ? 1 : -1
  return 0
}

export default function CsvViewer({ src = '/src/data/data.csv', initialRowsPerPage = 10 }) {
  const [allRows, setAllRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [error, setError] = useState(null)

  // pagination
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage)

  // sorting: { key, asc }
  const [sort, setSort] = useState({ key: null, asc: true })

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const resp = await fetch(src)
        if (!resp.ok) throw new Error('Failed to fetch CSV: ' + resp.status)
        const text = await resp.text()
        const res = parse(text, { header: true, skipEmptyLines: true })
        if (!mounted) return
        if (res.errors && res.errors.length) {
          console.warn('PapaParse errors', res.errors)
        }
        setAllRows(res.data)
        setHeaders(res.meta.fields || (res.data[0] ? Object.keys(res.data[0]) : []))
        setError(null)
      } catch (e) {
        if (!mounted) return
        setError(e.message || String(e))
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [src])

  const sorted = useMemo(() => {
    if (!sort.key) return allRows
    return [...allRows].sort((a, b) => compare(a[sort.key], b[sort.key], sort.asc))
  }, [allRows, sort])

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage
    return sorted.slice(start, start + rowsPerPage)
  }, [sorted, page, rowsPerPage])

  const pageCount = Math.max(1, Math.ceil(allRows.length / rowsPerPage))

  function toggleSort(key) {
    setPage(0)
    setSort(prev => {
      if (prev.key === key) return { key, asc: !prev.asc }
      return { key, asc: true }
    })
  }

  if (error) return <div className="csv-error">Error loading CSV: {error}</div>
  if (!allRows.length) return <div>Loading CSV...</div>

  return (
    <div className="csv-viewer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>Showing rows {page * rowsPerPage + 1} - {Math.min((page + 1) * rowsPerPage, allRows.length)} of {allRows.length}</div>
        <div>
          Rows per page:{' '}
          <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0) }}>
            {[5,10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table>
          <thead>
            <tr>
              {headers.map(h => (
                <th key={h} style={{ cursor: 'pointer' }} onClick={() => toggleSort(h)}>
                  {h} {sort.key === h ? (sort.asc ? '▲' : '▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((r, i) => (
              <tr key={i}>
                {headers.map(h => (
                  <td key={h + i}>{r[h] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <div>
          <button onClick={() => setPage(0)} disabled={page === 0}>First</button>{' '}
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Previous</button>{' '}
          <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>Next</button>{' '}
          <button onClick={() => setPage(pageCount - 1)} disabled={page >= pageCount - 1}>Last</button>
        </div>
        <div>Page {page + 1} / {pageCount}</div>
      </div>
    </div>
  )
}
