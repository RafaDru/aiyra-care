import fs from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './repo-root.mjs'

const t = fs.readFileSync(join(REPO_ROOT, 'tmp-caderneta-main.js'), 'utf8')
const idx = t.indexOf('saude-da-crianca')
console.log(t.slice(idx, idx + 1500))
