/**
 * One-off rename aiyra-care → aiyra-care / aiyracare → aiyracare (local defaults).
 * Preserves GCP legacy IDs: openhealth-503119, openhealth-documents-*, openhealth-account.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

const root = process.cwd()
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'test-results',
  'playwright-report',
])
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.woff', '.woff2'])

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, files)
    else files.push(p)
  }
  return files
}

function transform(text) {
  let s = text
  // Protect GCP legacy resource names
  const placeholders = []
  const protect = (re, label) => {
    s = s.replace(re, (m) => {
      const id = `__LEGACY_${label}_${placeholders.length}__`
      placeholders.push({ id, value: m })
      return id
    })
  }
  protect(/openhealth-503119/g, 'proj')
  protect(/openhealth-documents-503119/g, 'bucket')
  protect(/openhealth-account/g, 'sa')
  protect(/aiyracare-\*\.json/g, 'gitignore')

  // Specific before generic
  s = s.replace(/@aiyra-care\//g, '@aiyra-care/')
  s = s.replace(/aiyracare_preview/g, 'aiyracare_preview')
  s = s.replace(/aiyra-care-platform-for-users-and-patients/g, 'aiyra-care-platform-for-users-and-patients')
  s = s.replace(/aiyra-care-remember-me/g, 'aiyra-care-remember-me')
  s = s.replace(/aiyra-care-lang/g, 'aiyra-care-lang')
  s = s.replace(/aiyra-care-exam-slices/g, 'aiyra-care-exam-slices')
  s = s.replace(/aiyracare-caderneta/g, 'aiyracare-caderneta')
  s = s.replace(/aiyracare-dev\.dump/g, 'aiyracare-dev.dump')
  s = s.replace(/aiyracare_restore/g, 'aiyracare_restore')
  s = s.replace(/aiyra-care-api/g, 'aiyra-care-api')
  s = s.replace(/AiyraCare/g, 'AiyraCare')
  s = s.replace(/aiyra-care/g, 'aiyra-care')
  // DB name aiyracare (after _preview and protected ids)
  s = s.replace(/\/aiyracare\b/g, '/aiyracare')
  s = s.replace(/POSTGRES_DB: aiyracare/g, 'POSTGRES_DB: aiyracare')
  s = s.replace(/datname='aiyracare'/g, "datname='aiyracare'")
  s = s.replace(/PG `aiyracare`/g, 'PG `aiyracare`')
  s = s.replace(/PG aiyracare\b/g, 'PG aiyracare')
  s = s.replace(/database aiyracare\b/gi, 'database aiyracare')
  s = s.replace(/\bopenhealth\b/g, 'aiyracare')

  for (const { id, value } of placeholders) {
    s = s.replace(id, value)
  }
  return s
}

const files = walk(root)
let changed = 0
for (const file of files) {
  const ext = extname(file).toLowerCase()
  if (SKIP_EXT.has(ext)) continue
  try {
    const raw = readFileSync(file, 'utf8')
    if (!/aiyra-care|aiyracare|AiyraCare/i.test(raw)) continue
    const next = transform(raw)
    if (next !== raw) {
      writeFileSync(file, next, 'utf8')
      changed++
      console.log(file.replace(root + '\\', '').replace(root + '/', ''))
    }
  } catch {
    // binary skip
  }
}
console.log(`\nUpdated ${changed} files`)
