import fs from 'fs'

const t = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-caderneta-main.js', 'utf8')
const base = 'https://gerenciador-superapp-api.saude.gov.br'
let i = 0
while ((i = t.indexOf(base, i + 1)) >= 0) {
  console.log(t.slice(i, i + 200).replace(/\s+/g, ' '))
  console.log('---')
}
