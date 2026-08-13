import type { LegalDocumentKind } from './legal-document-kind.js'
import type { LegalDocument } from './legal-document.entity.js'

export interface LegalDocumentSeedInput {
  kind: LegalDocumentKind
  version: string
  title: string
  summary?: string | null
  contentPath: string
  contentSha256: string
  effectiveAt: Date
  requiresAcceptance?: boolean
}

export interface LegalDocumentRepository {
  findCurrentByKind(kind: LegalDocumentKind): Promise<LegalDocument | null>
  listCurrent(): Promise<LegalDocument[]>
  findById(id: string): Promise<LegalDocument | null>
  publishAsCurrent(input: LegalDocumentSeedInput): Promise<LegalDocument>
}
