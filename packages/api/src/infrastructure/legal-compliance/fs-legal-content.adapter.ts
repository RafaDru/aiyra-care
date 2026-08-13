import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { LegalContentPort } from '../../application/legal-compliance/legal-content.port.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function defaultMonorepoRoot(): string {
  return resolve(__dirname, '../../../../..') // packages/api/src/infrastructure/legal-compliance → monorepo root
}

export class FsLegalContentAdapter implements LegalContentPort {
  constructor(private readonly root = process.env.LEGAL_CONTENT_ROOT?.trim() || defaultMonorepoRoot()) {}

  resolveRoot(): string {
    return this.root
  }

  async readMarkdown(contentPath: string): Promise<{ content: string; sha256: string }> {
    const normalized = contentPath.replace(/\\/g, '/')
    const fullPath = isAbsolute(normalized)
      ? normalized
      : resolve(this.root, normalized)

    if (!existsSync(fullPath)) {
      throw new Error(`Documento legal não encontrado: ${contentPath}`)
    }

    const content = readFileSync(fullPath, 'utf8')
    const sha256 = createHash('sha256').update(content, 'utf8').digest('hex')
    return { content, sha256 }
  }
}

export function sha256Markdown(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}
