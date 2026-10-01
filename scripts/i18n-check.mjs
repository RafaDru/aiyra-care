#!/usr/bin/env node
/**
 * Fail if pt-BR.json and en.json key sets diverge.
 * Usage: npm run i18n:check
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = join(root, 'packages/web/src/i18n/locales')

function flatten(obj, prefix = '') {
  const out = {}
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flatten(value, path))
    } else {
      out[path] = value
    }
  }
  return out
}

const pt = flatten(JSON.parse(readFileSync(join(localesDir, 'pt-BR.json'), 'utf8')))
const en = flatten(JSON.parse(readFileSync(join(localesDir, 'en.json'), 'utf8')))

const missingEn = Object.keys(pt).filter((k) => !(k in en)).sort()
const missingPt = Object.keys(en).filter((k) => !(k in pt)).sort()

console.log(`pt-BR keys: ${Object.keys(pt).length}`)
console.log(`en keys:    ${Object.keys(en).length}`)

if (missingEn.length === 0 && missingPt.length === 0) {
  console.log('i18n:check PASS — key parity OK')
  process.exit(0)
}

if (missingEn.length > 0) {
  console.error(`\nMissing in en.json (${missingEn.length}):`)
  for (const k of missingEn.slice(0, 30)) console.error(`  - ${k}`)
  if (missingEn.length > 30) console.error(`  … and ${missingEn.length - 30} more`)
}

if (missingPt.length > 0) {
  console.error(`\nMissing in pt-BR.json (${missingPt.length}):`)
  for (const k of missingPt.slice(0, 30)) console.error(`  - ${k}`)
  if (missingPt.length > 30) console.error(`  … and ${missingPt.length - 30} more`)
}

process.exit(1)
