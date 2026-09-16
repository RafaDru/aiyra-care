import fs from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './repo-root.mjs'

const t = fs.readFileSync(join(REPO_ROOT, 'tmp-caderneta-main.js'), 'utf8')

const needles = [
  'immunizations', 'Immunization', 'vacinacao', 'lista_dependentes', 'tokenAuth',
  'BRClassificacaoLista', 'Composition', 'Observation', 'growth', 'crescimento',
  'desenvolvimento', 'getVacin', 'getImun', 'dependente', 'gerenciador',
]
for (const n of needles) {
  let pos = 0
  let found = 0
  while (found < 2 && (pos = t.indexOf(n, pos + 1)) >= 0) {
    const snippet = t.slice(pos, pos + 350).replace(/\s+/g, ' ')
    if (snippet.includes('http') || snippet.includes('/api') || snippet.includes('fhir') || snippet.includes('get(')) {
      console.log(`\n=== ${n} ===`)
      console.log(snippet)
      found++
    }
  }
}
