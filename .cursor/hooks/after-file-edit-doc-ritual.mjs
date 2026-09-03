import { auditWrite, readStdinJson } from './lib/audit.mjs'
import {
  clearDocRitualPending,
  isDocPath,
  isProductPath,
  markDocRitualPending,
  normalizePath,
  readDocRitualPending,
} from './lib/doc-ritual.mjs'

const input = readStdinJson()
const filePath = normalizePath(input.filePath ?? input.path ?? '')

if (filePath && isDocPath(filePath)) {
  clearDocRitualPending()
  process.stdout.write('{}')
  process.exit(0)
}

if (filePath && isProductPath(filePath)) {
  const pending = readDocRitualPending()
  if (!pending) {
    markDocRitualPending('product_edit_without_doc_touch', filePath)
    auditWrite('doc-ritual', {
      event: 'pending',
      filePath,
      hint: 'Atualize docs/roadmap.json e docs/features/ conforme DOCUMENTATION_SYSTEM.md',
    })
  }
}

process.stdout.write('{}')
