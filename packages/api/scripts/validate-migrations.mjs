/**
 * Valida migrations SQL em database/relational (CI gate).
 * - Arquivos NNN_name.sql
 * - Sem números duplicados
 * - Arquivo não vazio
 */
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../database/relational')
const files = readdirSync(dir).filter((f) => f.endsWith('.sql') && /^\d{3}_/.test(f)).sort()

const pattern = /^(\d{3})_[a-z0-9_]+\.sql$/i
const seen = new Map()
const errors = []

for (const file of files) {
  const m = file.match(pattern)
  if (!m) {
    errors.push(`${file}: nome deve ser NNN_snake_case.sql`)
    continue
  }
  const num = m[1]
  if (seen.has(num)) {
    errors.push(`número duplicado ${num}: ${seen.get(num)} e ${file}`)
  } else {
    seen.set(num, file)
  }
  const content = readFileSync(resolve(dir, file), 'utf8').trim()
  if (!content) errors.push(`${file}: arquivo vazio`)
}

if (errors.length) {
  console.error('validate-migrations FAILED:')
  for (const e of errors) console.error('  -', e)
  process.exit(1)
}

console.log(`validate-migrations OK (${files.length} files)`)
