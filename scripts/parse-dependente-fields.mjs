import fs from 'fs'

const t = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-chunk-1129.js', 'utf8')
const fields = ['nome', 'cpf', 'cns', 'dataNascimento', 'genero', 'idDependente', 'idade']
for (const f of fields) {
  let c = 0
  let i = 0
  while ((i = t.indexOf(f, i + 1)) >= 0 && c < 2) {
    console.log(f, t.slice(i, i + 80))
    c++
  }
}
