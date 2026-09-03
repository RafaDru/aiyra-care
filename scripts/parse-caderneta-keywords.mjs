import fs from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './repo-root.mjs'

const t = fs.readFileSync(join(REPO_ROOT, 'tmp-caderneta-main.js'), 'utf8')
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
