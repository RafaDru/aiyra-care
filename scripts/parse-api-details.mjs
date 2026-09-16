import fs from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './repo-root.mjs'

const t148 = fs.readFileSync(join(REPO_ROOT, 'tmp-chunk-148.js'), 'utf8')
const idx = t148.indexOf('lista-imunobiologicos')
console.log(t148.slice(idx - 200, idx + 800))

const t1129 = fs.readFileSync(join(REPO_ROOT, 'tmp-chunk-1129.js'), 'utf8')
const idx2 = t1129.indexOf('dependente/responsavel')
console.log('---dependente---')
console.log(t1129.slice(idx2 - 200, idx2 + 600))

const idx3 = t1129.indexOf('handoff')
if (idx3 >= 0) console.log('---handoff---', t1129.slice(idx3 - 100, idx3 + 400))
