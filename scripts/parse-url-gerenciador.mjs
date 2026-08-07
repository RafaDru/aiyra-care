import fs from 'fs'

const t = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-caderneta-main.js', 'utf8')
let i = 0
let c = 0
while ((i = t.indexOf('URL_GERENCIADOR', i + 1)) >= 0 && c < 40) {
  console.log(t.slice(Math.max(0, i - 100), i + 200).replace(/\s+/g, ' '))
  console.log('---')
  c++
}
