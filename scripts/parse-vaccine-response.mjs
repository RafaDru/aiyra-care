import fs from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './repo-root.mjs'

const t = fs.readFileSync(join(REPO_ROOT, 'tmp-chunk-148.js'), 'utf8')
for (const key of ['lista-imunobiologicos', 'historico-clinico', 'imunobiolog', 'statusVacina', 'dose', 'aplicad']) {
  let i = 0
  let c = 0
  while ((i = t.indexOf(key, i + 1)) >= 0 && c < 3) {
    console.log(`[${key}]`, t.slice(Math.max(0, i - 60), i + 120).replace(/\s+/g, ' '))
    c++
  }
}
