#!/usr/bin/env node
/** Extract string values from clinical *-copy.ts for i18n JSON (pt-BR source). */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function parseCopyObject(filePath) {
  const src = readFileSync(filePath, 'utf8')
  const start = src.indexOf('= {')
  if (start < 0) throw new Error(`No object in ${filePath}`)
  const objSrc = src.slice(start + 2)
  // eslint-disable-next-line no-new-func
  const obj = Function(`"use strict"; return (${objSrc})`)()
  return obj
}

const seqPath =
  process.argv[2] ??
  join(root, 'packages/web/src/components/patient/clinical-sequence-copy.ts')
const expPath =
  process.argv[3] ??
  join(root, 'packages/web/src/components/patient/clinical-export-copy.ts')

const seq = parseCopyObject(seqPath)
const exp = parseCopyObject(expPath)

if (process.argv.includes('--verbose')) {
  console.error('clinicalSequence keys:', Object.keys(seq).length)
  console.error('clinicalExport keys:', Object.keys(exp).length)
}
console.log(JSON.stringify({ clinicalSequence: seq, clinicalExport: exp }, null, 2))
