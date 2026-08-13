import type { LegalDocumentKind } from '../../domain/legal-compliance/legal-document-kind.js'
import { REQUIRED_LEGAL_ACCEPTANCE_KINDS } from '../../domain/legal-compliance/legal-document-kind.js'
import type { LegalDocument } from '../../domain/legal-compliance/legal-document.entity.js'
import type { LegalDocumentRepository } from '../../domain/legal-compliance/legal-document.repository.js'
import type { LegalAcceptanceRepository } from '../../domain/legal-compliance/legal-acceptance.repository.js'
import type { LegalContentPort } from './legal-content.port.js'
import type { ComplianceGatePort, ComplianceStatus } from './compliance-gate.port.js'
import { buildGoLiveStatus, getLegalPublisher, type GoLiveStatus, type LegalPublisher } from './legal-publisher.js'

export interface ComplianceContactInfo {
  privacyEmail: string
  supportEmail: string | null
  dpoSlaDays: number
  dataSubjectRequestPath: string
  privacyPolicyUrl: string
  termsUrl: string
  cookiePolicyUrl: string
  dataProcessingMapPath: string
  incidentResponsePath: string
  publisher: LegalPublisher
}

export interface LegalDocumentView {
  id: string
  kind: LegalDocumentKind
  version: string
  title: string
  summary: string | null
  contentPath: string
  contentSha256: string
  effectiveAt: string
  publishedAt: string
  requiresAcceptance: boolean
}

export interface LegalDocumentWithContent extends LegalDocumentView {
  content: string
  publisher: LegalPublisher
}

export class LegalComplianceService implements ComplianceGatePort {
  constructor(
    private readonly documents: LegalDocumentRepository,
    private readonly acceptances: LegalAcceptanceRepository,
    private readonly content: LegalContentPort,
  ) {}

  async listCurrentDocuments(): Promise<LegalDocumentView[]> {
    const docs = await this.documents.listCurrent()
    return docs.map((d) => this.toView(d))
  }

  async getCurrentDocument(kind: LegalDocumentKind): Promise<LegalDocumentWithContent | null> {
    const doc = await this.documents.findCurrentByKind(kind)
    if (!doc) return null
    const { content } = await this.content.readMarkdown(doc.contentPath)
    return { ...this.toView(doc), content, publisher: getLegalPublisher() }
  }

  async getGoLiveStatus(): Promise<GoLiveStatus> {
    const current = await this.documents.listCurrent()
    const requiredPublished = current.filter(
      (d) => d.requiresAcceptance && REQUIRED_LEGAL_ACCEPTANCE_KINDS.includes(d.kind),
    ).length
    return buildGoLiveStatus({
      documentsPublished: current.length,
      requiredKindsPublished: requiredPublished,
    })
  }

  async getStatus(accountId: string): Promise<ComplianceStatus> {
    const required = [...REQUIRED_LEGAL_ACCEPTANCE_KINDS]
    const currentDocs = await this.documents.listCurrent()
    const requiredDocs = currentDocs.filter(
      (d) => d.requiresAcceptance && required.includes(d.kind),
    )
    const accepted = await this.acceptances.findByAccount(accountId)
    const acceptedDocIds = new Set(accepted.map((a) => a.documentId))

    const pendingKinds = requiredDocs
      .filter((d) => !acceptedDocIds.has(d.id))
      .map((d) => d.kind)

    const acceptances = accepted.map((a) => ({
      kind: a.documentKind,
      version: a.documentVersion,
      acceptedAt: a.acceptedAt.toISOString(),
      documentId: a.documentId,
    }))

    return {
      compliant: pendingKinds.length === 0,
      requiredKinds: required,
      pendingKinds,
      acceptances,
    }
  }

  async assertCompliant(accountId: string): Promise<void> {
    const status = await this.getStatus(accountId)
    if (!status.compliant) {
      const err = new Error('Aceite de termos/política pendente') as Error & { code?: string; pendingKinds?: string[] }
      err.code = 'COMPLIANCE_PENDING'
      err.pendingKinds = status.pendingKinds
      throw err
    }
  }

  async hasAcceptedKind(accountId: string, kind: LegalDocumentKind): Promise<boolean> {
    const doc = await this.documents.findCurrentByKind(kind)
    if (!doc?.requiresAcceptance) return true
    const existing = await this.acceptances.findByAccountAndDocument(accountId, doc.id)
    return !!existing
  }

  async assertMinorGuardianConsent(accountId: string): Promise<void> {
    const doc = await this.documents.findCurrentByKind('minor_guardian_consent')
    if (!doc) return
    const ok = await this.hasAcceptedKind(accountId, 'minor_guardian_consent')
    if (!ok) {
      const err = new Error('Consentimento do responsável pendente para cadastro de menor') as Error & {
        code?: string
      }
      err.code = 'MINOR_GUARDIAN_CONSENT_REQUIRED'
      throw err
    }
  }

  getContactInfo(): ComplianceContactInfo {
    const webBase = process.env.WEB_PUBLIC_URL?.trim() || 'http://localhost:5173'
    const dpoSlaDays = Number(process.env.LEGAL_DPO_SLA_DAYS ?? 15)
    return {
      privacyEmail: process.env.LEGAL_PRIVACY_EMAIL?.trim() || 'privacidade@aiyracare.com',
      supportEmail: process.env.LEGAL_SUPPORT_EMAIL?.trim() || null,
      dpoSlaDays: Number.isFinite(dpoSlaDays) && dpoSlaDays > 0 ? Math.floor(dpoSlaDays) : 15,
      dataSubjectRequestPath: 'docs/legal/DATA_SUBJECT_REQUEST.md',
      privacyPolicyUrl: `${webBase}/privacidade`,
      termsUrl: `${webBase}/termos`,
      cookiePolicyUrl: `${webBase}/cookies`,
      dataProcessingMapPath: 'docs/legal/DATA_PROCESSING_MAP.md',
      incidentResponsePath: 'docs/legal/INCIDENT_RESPONSE.md',
      publisher: getLegalPublisher(),
    }
  }

  async acceptDocuments(args: {
    accountId: string
    kinds?: LegalDocumentKind[]
    documentIds?: string[]
    acceptanceIp?: string | null
    userAgent?: string | null
  }): Promise<ComplianceStatus> {
    const targets: LegalDocument[] = []

    if (args.documentIds?.length) {
      for (const id of args.documentIds) {
        const doc = await this.documents.findById(id)
        if (doc?.isCurrent) targets.push(doc)
      }
    } else if (args.kinds?.length) {
      for (const kind of args.kinds) {
        const doc = await this.documents.findCurrentByKind(kind)
        if (doc) targets.push(doc)
      }
    } else {
      const current = await this.documents.listCurrent()
      targets.push(...current.filter((d) => d.requiresAcceptance))
    }

    for (const doc of targets) {
      const existing = await this.acceptances.findByAccountAndDocument(args.accountId, doc.id)
      if (existing) continue

      await this.acceptances.record({
        accountId: args.accountId,
        documentId: doc.id,
        documentKind: doc.kind,
        documentVersion: doc.version,
        contentSha256: doc.contentSha256,
        acceptanceIp: args.acceptanceIp,
        userAgent: args.userAgent,
      })
    }

    return this.getStatus(args.accountId)
  }

  private toView(doc: LegalDocument): LegalDocumentView {
    return {
      id: doc.id,
      kind: doc.kind,
      version: doc.version,
      title: doc.title,
      summary: doc.summary,
      contentPath: doc.contentPath,
      contentSha256: doc.contentSha256,
      effectiveAt: doc.effectiveAt.toISOString(),
      publishedAt: doc.publishedAt.toISOString(),
      requiresAcceptance: doc.requiresAcceptance,
    }
  }
}
