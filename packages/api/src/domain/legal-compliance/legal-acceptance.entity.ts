import type { LegalDocumentKind } from './legal-document-kind.js'

export interface LegalAcceptanceProps {
  accountId: string
  documentId: string
  documentKind: LegalDocumentKind
  documentVersion: string
  contentSha256: string
  acceptanceIp?: string | null
  userAgent?: string | null
}

export interface LegalAcceptanceData {
  id: string
  accountId: string
  documentId: string
  documentKind: LegalDocumentKind
  documentVersion: string
  contentSha256: string
  acceptedAt: Date
  acceptanceIp: string | null
  userAgent: string | null
}

export class LegalAcceptance {
  private constructor(private readonly data: LegalAcceptanceData) {}

  static create(props: LegalAcceptanceProps, id?: string): LegalAcceptance {
    return new LegalAcceptance({
      id: id ?? crypto.randomUUID(),
      accountId: props.accountId,
      documentId: props.documentId,
      documentKind: props.documentKind,
      documentVersion: props.documentVersion,
      contentSha256: props.contentSha256,
      acceptedAt: new Date(),
      acceptanceIp: props.acceptanceIp ?? null,
      userAgent: props.userAgent ?? null,
    })
  }

  static restore(data: LegalAcceptanceData): LegalAcceptance {
    return new LegalAcceptance(data)
  }

  get id(): string { return this.data.id }
  get accountId(): string { return this.data.accountId }
  get documentId(): string { return this.data.documentId }
  get documentKind(): LegalDocumentKind { return this.data.documentKind }
  get documentVersion(): string { return this.data.documentVersion }
  get contentSha256(): string { return this.data.contentSha256 }
  get acceptedAt(): Date { return this.data.acceptedAt }

  toJSON(): LegalAcceptanceData {
    return { ...this.data }
  }
}
