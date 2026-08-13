import { createHash } from 'node:crypto'
import type { LegalContentPort } from '../../application/legal-compliance/legal-content.port.js'

export class HttpLegalContentAdapter implements LegalContentPort {
  constructor(private readonly baseUrl = process.env.LEGAL_CMS_BASE_URL?.trim().replace(/\/$/, '') ?? '') {}

  resolveRoot(): string {
    return this.baseUrl
  }

  async readMarkdown(contentPath: string): Promise<{ content: string; sha256: string }> {
    if (!this.baseUrl) {
      throw new Error('LEGAL_CMS_BASE_URL não configurado para adapter http')
    }
    const normalized = contentPath.replace(/\\/g, '/').replace(/^\/+/, '')
    const url = `${this.baseUrl}/${normalized}`
    const res = await fetch(url, { headers: { Accept: 'text/markdown, text/plain, */*' } })
    if (!res.ok) {
      throw new Error(`CMS HTTP ${res.status} ao buscar ${url}`)
    }
    const content = await res.text()
    const sha256 = createHash('sha256').update(content, 'utf8').digest('hex')
    return { content, sha256 }
  }
}
