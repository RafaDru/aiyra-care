import fs from 'fs'

const t = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-caderneta-main.js', 'utf8')
const keywords = [
  'Immunization', 'immunizations', 'dependente', 'Dependente', 'familia', 'Familia',
  'crescimento', 'desenvolvimento', 'Recommendation', 'List?', 'Patient/',
  'gerenciador', 'superapp', 'vacinacao', 'dose', 'BRClassificacao',
]
for (const kw of keywords) {
  let i = 0
  let c = 0
  while ((i = t.indexOf(kw, i + 1)) >= 0 && c < 3) {
    console.log(`[${kw}]`, t.slice(Math.max(0, i - 60), i + 100).replace(/\s+/g, ' '))
    c++
  }
}
