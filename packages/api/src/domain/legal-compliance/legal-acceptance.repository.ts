import type { LegalDocumentKind } from './legal-document-kind.js'
import type { LegalAcceptance } from './legal-acceptance.entity.js'

export interface RecordAcceptanceInput {
  accountId: string
  documentId: string
  documentKind: LegalDocumentKind
  documentVersion: string
  contentSha256: string
  acceptanceIp?: string | null
  userAgent?: string | null
}

export interface LegalAcceptanceRepository {
  findByAccount(accountId: string): Promise<LegalAcceptance[]>
  findByAccountAndDocument(accountId: string, documentId: string): Promise<LegalAcceptance | null>
  record(input: RecordAcceptanceInput): Promise<LegalAcceptance>
}
