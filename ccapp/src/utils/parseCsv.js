const Papa = require('papaparse')

function parseCsv(text, { header = true, skipEmptyLines = true } = {}) {
  if (typeof text !== 'string') throw new TypeError('text must be a string')

  const res = Papa.parse(text, {
    header,
    skipEmptyLines,
    dynamicTyping: false,
    transform: v => (typeof v === 'string' ? v.trim() : v),
  })

  if (res.errors && res.errors.length) {
    // throw the first error for visibility; caller can inspect full errors
    const e = res.errors[0]
    const err = new Error(`CSV parse error: ${e.message || e.code}`)
    err.details = res.errors
    throw err
  }

  return res.data
}

module.exports = { parseCsv }
