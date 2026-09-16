import fs from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './repo-root.mjs'

const t = fs.readFileSync(join(REPO_ROOT, 'tmp-chunk-148.js'), 'utf8')
const idx = t.indexOf('vacinasRNDS')
console.log(t.slice(idx, idx + 2000))
