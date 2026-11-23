import { auditWrite, readStdinJson } from './lib/audit.mjs'
import { isProductPath, normalizePath } from './lib/doc-ritual.mjs'
import { markDeliveryLotPending } from './lib/delivery-lot.mjs'

const input = readStdinJson()
const filePath = normalizePath(input.filePath ?? input.path ?? '')

if (filePath && isProductPath(filePath)) {
  markDeliveryLotPending(filePath)
  auditWrite('delivery-lot', { event: 'pending', filePath })
}

process.stdout.write('{}')