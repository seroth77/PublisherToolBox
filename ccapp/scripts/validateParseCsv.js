const fs = require('fs')
const path = require('path')
const { parseCsv } = require('../src/utils/parseCsv')

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(2)
  }
}

// simple test
const csv1 = 'a,b,c\n1,2,3\n4,5,6\n'
const r1 = parseCsv(csv1)
assert(Array.isArray(r1) && r1.length === 2, 'simple parse length')
assert(r1[0].a === '1' && r1[1].c === '6', 'simple parse values')

// quoted field test
const csv2 = 'col1,col2\n"hello, world","line1\nline2"\n'
const r2 = parseCsv(csv2)
assert(r2.length === 1, 'quoted rows count')
assert(r2[0].col1 === 'hello, world', 'quoted comma')
assert(r2[0].col2 === 'line1\nline2', 'quoted newline')

// real file
const p = path.join(__dirname, '..', 'src', 'data', 'data.csv')
const text = fs.readFileSync(p, 'utf8')
const rows = parseCsv(text)
assert(Array.isArray(rows), 'real parse is array')
assert(rows.length > 5, 'real parse row count > 5')
assert(rows[0]['What is your name?'] !== undefined, 'real parse header exists')

console.log('PASS: parseCsv validation all checks passed')
process.exit(0)
