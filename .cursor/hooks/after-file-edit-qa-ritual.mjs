import { auditWrite, readStdinJson } from './lib/audit.mjs'
import { isProductPath, normalizePath } from './lib/doc-ritual.mjs'
import {
  isQaDocPath,
  markQaRitualPending,
  touchQaSuiteDoc,
} from './lib/qa-ritual.mjs'

const input = readStdinJson()
const filePath = normalizePath(input.filePath ?? input.path ?? '')

if (filePath && isQaDocPath(filePath)) {
  touchQaSuiteDoc(filePath)
  auditWrite('qa-ritual', { event: 'suite_doc_touch', filePath })
  process.stdout.write('{}')
  process.exit(0)
}

if (filePath && isProductPath(filePath)) {
  markQaRitualPending(filePath)
  auditWrite('qa-ritual', {
    event: 'pending',
    filePath,
    hint: 'Ao entregar: suite QA + npm run qa:run — docs/testing/QA_PROCESS.md',
  })
}

process.stdout.write('{}')
