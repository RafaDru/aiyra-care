import fs from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './repo-root.mjs'

const t = fs.readFileSync(join(REPO_ROOT, 'tmp-caderneta-main.js'), 'utf8')
const re = /path:"saude-da-crianca"[^}]{0,500}/g
let m
while ((m = re.exec(t)) !== null) {
  console.log(m[0])
}
