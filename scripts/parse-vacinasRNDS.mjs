import fs from 'fs'

const t = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-chunk-148.js', 'utf8')
const idx = t.indexOf('vacinasRNDS')
console.log(t.slice(idx, idx + 2000))
