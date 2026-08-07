import fs from 'fs'

const t = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-chunk-5118.js', 'utf8')
const idx = t.indexOf('/v1/dataset')
console.log(t.slice(idx - 100, idx + 500))
