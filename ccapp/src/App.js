import './App.css'
import { useState, useEffect } from 'react'
import CsvViewer from './components/CsvViewer'
import ContentGrid from './components/ContentGrid'
import { parse } from 'papaparse'

function App() {
  const [csvData, setCsvData] = useState([])
  const [isTableExpanded, setIsTableExpanded] = useState(false)
  
  useEffect(() => {
    async function loadData() {
      const resp = await fetch('/data/data.csv')
      const text = await resp.text()
      const result = parse(text, { header: true, skipEmptyLines: true })
      console.log('CSV Data loaded:', {
        totalRows: result.data.length,
        errors: result.errors,
        first: result.data[0],
        last: result.data[result.data.length - 1]
      })
      setCsvData(result.data)
    }
    loadData()
  }, [])

  const toggleTable = () => setIsTableExpanded(!isTableExpanded)

  return (
    <div className="App">
      <header className="App-header">
        <h1>Content Creator Database</h1>
      </header>
      <main className="App-main">
        <section className="table-section">
          <div className="table-header">
            <h2>Table View</h2>
            <button 
              className="toggle-button"
              onClick={toggleTable}
              aria-expanded={isTableExpanded}
              aria-controls="table-content"
            >
              {isTableExpanded ? 'Hide Table' : 'Show Table'}
            </button>
          </div>
          <div 
            id="table-content"
            className={`table-content ${isTableExpanded ? 'expanded' : ''}`}
          >
            <CsvViewer src="/data/data.csv" maxRows={50} />
          </div>
        </section>
        
        <section className="content-grid-section">
          <ContentGrid items={csvData} />
        </section>
      </main>
    </div>
  )
}

export default App
