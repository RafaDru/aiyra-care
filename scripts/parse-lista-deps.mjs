import fs from 'fs'

const t = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-caderneta-main.js', 'utf8')
const needles = ['cache_lista_dependentes', 'listaDependentes', 'ListaDependentes', 'getDependentes', 'dependente/', '/dependente']
for (const n of needles) {
  let i = 0
  let c = 0
  while ((i = t.indexOf(n, i + 1)) >= 0 && c < 8) {
    console.log(`[${n}]`, t.slice(Math.max(0, i - 100), i + 250).replace(/\s+/g, ' '))
    c++
  }
}
