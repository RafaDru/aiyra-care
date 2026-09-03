import fs from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './repo-root.mjs'

const t = fs.readFileSync(join(REPO_ROOT, 'tmp-chunk-5118.js'), 'utf8')
const idx = t.indexOf('/v1/dataset')
console.log(t.slice(idx - 100, idx + 500))
