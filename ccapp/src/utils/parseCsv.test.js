const fs = require('fs')
const path = require('path')
const { parseCsv } = require('./parseCsv')

test('parse simple CSV', () => {
  const csv = 'a,b,c\n1,2,3\n4,5,6\n'
  const res = parseCsv(csv)
  expect(res).toEqual([
    { a: '1', b: '2', c: '3' },
    { a: '4', b: '5', c: '6' },
  ])
})

test('handles quoted fields with commas and newlines', () => {
  const csv = 'col1,col2\n"hello, world","line1\nline2"\n'
  const res = parseCsv(csv)
  expect(res.length).toBe(1)
  expect(res[0].col1).toBe('hello, world')
  expect(res[0].col2).toBe('line1\nline2')
})

test('parses real data file', () => {
  const p = path.join(__dirname, '..', 'data', 'data.csv')
  const text = fs.readFileSync(p, 'utf8')
  const rows = parseCsv(text)
  // there should be many rows; ensure header fields are present
  expect(Array.isArray(rows)).toBe(true)
  expect(rows.length).toBeGreaterThan(5)
  // check that a known header key exists
  const sample = rows[0]
  expect(sample).toHaveProperty('What is your name?')
  expect(sample).toHaveProperty('What country are located in?')
})
