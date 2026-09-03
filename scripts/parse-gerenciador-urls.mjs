import fs from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './repo-root.mjs'

const t = fs.readFileSync(join(REPO_ROOT, 'tmp-caderneta-main.js'), 'utf8')
const base = 'https://gerenciador-superapp-api.saude.gov.br'
let i = 0
while ((i = t.indexOf(base, i + 1)) >= 0) {
  console.log(t.slice(i, i + 200).replace(/\s+/g, ' '))
  console.log('---')
}
