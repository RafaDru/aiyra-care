import fs from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './repo-root.mjs'

const t = fs.readFileSync(join(REPO_ROOT, 'tmp-caderneta-main.js'), 'utf8')

function contextAround(substr, len = 200) {
  const i = t.indexOf(substr)
  if (i < 0) return null
  return t.slice(Math.max(0, i - len), i + len)
}

console.log('dependentes:', contextAround('dependentes'))
console.log('---')
console.log('vinculo:', contextAround('vinculo'))
console.log('---')
console.log('grupo-familiar:', contextAround('grupo-familiar'))
console.log('---')
console.log('superapp-api:', contextAround('superapp-api'))
console.log('---')
console.log('EHR_SERVICE:', contextAround('EHR_SERVICE'))
console.log('---')
console.log('fhir/r4:', contextAround('fhir/r4'))
