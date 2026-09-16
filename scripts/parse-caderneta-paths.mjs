import fs from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './repo-root.mjs'

const t = fs.readFileSync(join(REPO_ROOT, 'tmp-caderneta-main.js'), 'utf8')
// Find strings that look like REST paths
const paths = [...t.matchAll(/["']([a-z][a-z0-9-]*(?:\/[a-z0-9-]+){1,5})["']/gi)]
  .map((m) => m[1])
  .filter((p) =>
    p.includes('depend') ||
    p.includes('famil') ||
    p.includes('vacin') ||
    p.includes('crian') ||
    p.includes('token') ||
    p.includes('login') ||
    p.includes('patient') ||
    p.includes('immun') ||
    p.includes('superapp') ||
    p.includes('gerenciador'),
  )
console.log([...new Set(paths)].sort().join('\n'))

// superapp API method names
const superapp = [...t.matchAll(/URL_GERENCIADOR[^;]{0,500}/g)]
console.log('superapp config:', superapp[0]?.[0]?.slice(0, 400))
