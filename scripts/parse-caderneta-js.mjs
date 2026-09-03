import fs from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './repo-root.mjs'

const t = fs.readFileSync(join(REPO_ROOT, 'tmp-caderneta-main.js'), 'utf8')

const apiPaths = [...t.matchAll(/['"`](\/api\/[^'"`]+)['"`]/g)].map((x) => x[1])
console.log('API paths:', [...new Set(apiPaths)].join('\n'))

const endpoints = [...t.matchAll(/['"`]([a-z-]+\/[a-z0-9-]+(?:\/[a-z0-9-]+)*)['"`]/gi)]
  .map((x) => x[1])
  .filter((p) => p.includes('depend') || p.includes('famil') || p.includes('vacin') || p.includes('crian') || p.includes('immun'))
console.log('Relevant paths:', [...new Set(endpoints)].join('\n'))

const idx = t.indexOf('gerenciador-superapp-api')
let count = 0
let i = 0
while ((i = t.indexOf('gerenciador', i + 1)) >= 0 && count < 20) {
  console.log(t.slice(i, i + 150).replace(/\n/g, ' '))
  count++
}
