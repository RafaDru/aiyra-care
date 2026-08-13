import { REQUIRED_LEGAL_ACCEPTANCE_KINDS } from '../../domain/legal-compliance/legal-document-kind.js'

function isComplianceGateEnabled(): boolean {
  const raw = process.env.COMPLIANCE_GATE_ENABLED?.trim().toLowerCase()
  if (raw === '1' || raw === 'true' || raw === 'yes') return true
  if (raw === '0' || raw === 'false' || raw === 'no') return false
  return false
}

export interface LegalPublisher {
  entityName: string | null
  cnpj: string | null
  address: string | null
  complete: boolean
}

export interface GoLiveChecklistItem {
  id: string
  ok: boolean
  detail?: string
}

function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

function isStripeLiveMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? ''
  return key.startsWith('sk_live_')
}

function getDpoSlaDays(): number {
  const n = Number(process.env.LEGAL_DPO_SLA_DAYS ?? 15)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 15
}

export interface GoLiveStatus {
  complianceGateEnabled: boolean
  publisher: LegalPublisher
  privacyEmail: string
  stripeConfigured: boolean
  stripeLiveMode: boolean
  dpoSlaDays: number
  documentsPublished: number
  requiredDocumentsOk: boolean
  readyForPublicBilling: boolean
  checklist: GoLiveChecklistItem[]
}

export function getLegalPublisher(): LegalPublisher {
  const entityName = process.env.LEGAL_ENTITY_NAME?.trim() || null
  const cnpj = process.env.LEGAL_CNPJ?.replace(/\D/g, '').trim() || null
  const address = process.env.LEGAL_ENTITY_ADDRESS?.trim() || null
  const complete = Boolean(entityName && cnpj && cnpj.length === 14)
  return { entityName, cnpj, address, complete }
}

export function buildGoLiveStatus(args: {
  documentsPublished: number
  requiredKindsPublished: number
}): GoLiveStatus {
  const publisher = getLegalPublisher()
  const privacyEmail = process.env.LEGAL_PRIVACY_EMAIL?.trim() || ''
  const privacyOk = privacyEmail.length > 3 && privacyEmail.includes('@')
  const stripeConfigured = isStripeConfigured()
  const stripeLiveMode = isStripeLiveMode()
  const dpoSlaDays = getDpoSlaDays()
  const gateEnabled = isComplianceGateEnabled()
  const requiredOk = args.requiredKindsPublished >= REQUIRED_LEGAL_ACCEPTANCE_KINDS.length
  const readyForPublicBilling = publisher.complete && privacyOk && requiredOk && stripeConfigured && stripeLiveMode

  const checklist: GoLiveChecklistItem[] = [
    { id: 'legal_entity', ok: publisher.complete, detail: publisher.entityName ?? undefined },
    { id: 'privacy_email', ok: privacyOk, detail: privacyEmail || undefined },
    { id: 'required_documents', ok: requiredOk, detail: `${args.requiredKindsPublished}/${REQUIRED_LEGAL_ACCEPTANCE_KINDS.length}` },
    { id: 'compliance_gate', ok: gateEnabled },
    { id: 'stripe_configured', ok: stripeConfigured },
    { id: 'stripe_live', ok: stripeLiveMode },
    { id: 'dpo_sla', ok: privacyOk && dpoSlaDays > 0, detail: `${dpoSlaDays} dias` },
    { id: 'lawyer_review', ok: false },
    { id: 'nfse_process', ok: false },
  ]

  return {
    complianceGateEnabled: gateEnabled,
    publisher,
    privacyEmail: privacyEmail || 'privacidade@aiyracare.com',
    stripeConfigured,
    stripeLiveMode,
    dpoSlaDays,
    documentsPublished: args.documentsPublished,
    requiredDocumentsOk: requiredOk,
    readyForPublicBilling,
    checklist,
  }
}
