import fs from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './repo-root.mjs'

const t = fs.readFileSync(join(REPO_ROOT, 'tmp-caderneta-main.js'), 'utf8')
let i = 0
let c = 0
while ((i = t.indexOf('URL_GERENCIADOR', i + 1)) >= 0 && c < 40) {
  console.log(t.slice(Math.max(0, i - 100), i + 200).replace(/\s+/g, ' '))
  console.log('---')
  c++
}
