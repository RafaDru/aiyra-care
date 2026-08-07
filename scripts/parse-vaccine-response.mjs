import fs from 'fs'

const t = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-chunk-148.js', 'utf8')
for (const key of ['lista-imunobiologicos', 'historico-clinico', 'imunobiolog', 'statusVacina', 'dose', 'aplicad']) {
  let i = 0
  let c = 0
  while ((i = t.indexOf(key, i + 1)) >= 0 && c < 3) {
    console.log(`[${key}]`, t.slice(Math.max(0, i - 60), i + 120).replace(/\s+/g, ' '))
    c++
  }
}
