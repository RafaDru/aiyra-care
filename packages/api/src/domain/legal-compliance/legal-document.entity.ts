import type { LegalDocumentKind } from './legal-document-kind.js'

export interface LegalDocumentProps {
  kind: LegalDocumentKind
  version: string
  title: string
  summary?: string | null
  contentPath: string
  contentSha256: string
  effectiveAt: Date
  publishedAt?: Date
  isCurrent?: boolean
  requiresAcceptance?: boolean
}

export interface LegalDocumentData {
  id: string
  kind: LegalDocumentKind
  version: string
  title: string
  summary: string | null
  contentPath: string
  contentSha256: string
  effectiveAt: Date
  publishedAt: Date
  isCurrent: boolean
  requiresAcceptance: boolean
  createdAt: Date
}

export class LegalDocument {
  private constructor(private readonly data: LegalDocumentData) {}

  static create(props: LegalDocumentProps, id?: string): LegalDocument {
    return new LegalDocument({
      id: id ?? crypto.randomUUID(),
      kind: props.kind,
      version: props.version,
      title: props.title,
      summary: props.summary ?? null,
      contentPath: props.contentPath,
      contentSha256: props.contentSha256,
      effectiveAt: props.effectiveAt,
      publishedAt: props.publishedAt ?? new Date(),
      isCurrent: props.isCurrent ?? false,
      requiresAcceptance: props.requiresAcceptance ?? true,
      createdAt: new Date(),
    })
  }

  static restore(data: LegalDocumentData): LegalDocument {
    return new LegalDocument(data)
  }

  get id(): string { return this.data.id }
  get kind(): LegalDocumentKind { return this.data.kind }
  get version(): string { return this.data.version }
  get title(): string { return this.data.title }
  get summary(): string | null { return this.data.summary }
  get contentPath(): string { return this.data.contentPath }
  get contentSha256(): string { return this.data.contentSha256 }
  get effectiveAt(): Date { return this.data.effectiveAt }
  get publishedAt(): Date { return this.data.publishedAt }
  get isCurrent(): boolean { return this.data.isCurrent }
  get requiresAcceptance(): boolean { return this.data.requiresAcceptance }

  toJSON(): LegalDocumentData {
    return { ...this.data }
  }
}
