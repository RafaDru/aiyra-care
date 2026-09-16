import fs from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './repo-root.mjs'

const t = fs.readFileSync(join(REPO_ROOT, 'tmp-caderneta-main.js'), 'utf8')
// Find http.get/post patterns near dependente or responsavel
const re = /http\.(get|post)\([^)]{0,400}\)/g
let m
let count = 0
while ((m = re.exec(t)) !== null && count < 50) {
  const s = m[0]
  if (
    s.includes('depend') ||
    s.includes('famil') ||
    s.includes('vacin') ||
    s.includes('immun') ||
    s.includes('List') ||
    s.includes('fhir') ||
    s.includes('gerenciador') ||
    s.includes('PROXY') ||
    s.includes('token')
  ) {
    console.log(s.replace(/\s+/g, ' ').slice(0, 400))
    console.log('---')
    count++
  }
}
