import type { LegalContentPort } from '../../application/legal-compliance/legal-content.port.js'
import { FsLegalContentAdapter } from './fs-legal-content.adapter.js'
import { GcsLegalContentAdapter } from './gcs-legal-content.adapter.js'
import { HttpLegalContentAdapter } from './http-legal-content.adapter.js'

/**
 * LEGAL_CONTENT_ADAPTER: fs (default) | http | gcs
 * - http: LEGAL_CMS_BASE_URL + content_path do documento
 * - gcs: LEGAL_CMS_GCS_BUCKET + LEGAL_CMS_GCS_PREFIX
 */
export function createLegalContentPort(): LegalContentPort {
  const mode = process.env.LEGAL_CONTENT_ADAPTER?.trim().toLowerCase() || 'fs'
  if (mode === 'http') return new HttpLegalContentAdapter()
  if (mode === 'gcs') return new GcsLegalContentAdapter()
  return new FsLegalContentAdapter()
}
