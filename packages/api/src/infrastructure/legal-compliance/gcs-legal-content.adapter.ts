import { createHash } from 'node:crypto'
import { Storage } from '@google-cloud/storage'
import type { LegalContentPort } from '../../application/legal-compliance/legal-content.port.js'

export class GcsLegalContentAdapter implements LegalContentPort {
  private readonly storage = new Storage()
  private readonly bucket = process.env.LEGAL_CMS_GCS_BUCKET?.trim() ?? ''
  private readonly prefix = (process.env.LEGAL_CMS_GCS_PREFIX?.trim() || 'legal').replace(/\/$/, '')

  resolveRoot(): string {
    return `gs://${this.bucket}/${this.prefix}`
  }

  async readMarkdown(contentPath: string): Promise<{ content: string; sha256: string }> {
    if (!this.bucket) {
      throw new Error('LEGAL_CMS_GCS_BUCKET não configurado para adapter gcs')
    }
    const normalized = contentPath.replace(/\\/g, '/').replace(/^\/+/, '')
    const objectPath = normalized.startsWith(this.prefix)
      ? normalized
      : `${this.prefix}/${normalized.replace(/^docs\/legal\//, '')}`
    const [buf] = await this.storage.bucket(this.bucket).file(objectPath).download()
    const content = buf.toString('utf8')
    const sha256 = createHash('sha256').update(content, 'utf8').digest('hex')
    return { content, sha256 }
  }
}
