import fs from 'fs'

const t = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-caderneta-main.js', 'utf8')
const needles = ['govbr-proxy', 'token/gerar', 'tokenAuth', 'lista_dependentes', 'dependentes', 'superapp', 'miniapp', 'scp_']
for (const n of needles) {
  let i = 0
  let c = 0
  while ((i = t.indexOf(n, i + 1)) >= 0 && c < 5) {
    console.log(`[${n}]`, t.slice(Math.max(0, i - 80), i + 150).replace(/\s+/g, ' '))
    c++
  }
}
