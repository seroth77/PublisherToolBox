import './App.css'
import { useState, useEffect } from 'react'
import CsvViewer from './components/CsvViewer'
import ContentGrid from './components/ContentGrid'
import { parse } from 'papaparse'

function App() {
  const [csvData, setCsvData] = useState([])
  
  useEffect(() => {
    async function loadData() {
      const resp = await fetch('/data/data.csv')
      const text = await resp.text()
      const result = parse(text, { header: true, skipEmptyLines: true })
      setCsvData(result.data)
    }
    loadData()
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <h1>Content Creator Database</h1>
      </header>
      <main style={{ padding: 16 }}>
        <section>
          <h2>Table View</h2>
          <CsvViewer src="/data/data.csv" maxRows={50} />
        </section>
        
        <ContentGrid items={csvData} />
      </main>
    </div>
  )
}

export default App
