export interface Patient {
  id: string
  name: string
  birthDate: string
  gender: 'male' | 'female' | null
  bloodType: string | null
  ageCategory: 'children' | 'adolescents' | 'adults'
  isSelf?: boolean
  createdAt: string
  updatedAt: string
}

export type LlmQuotaStatus = 'ok' | 'warn' | 'exhausted'

export interface LlmUsageQuota {
  scopeId: string
  tokensPerCredit: number
  monthlyTokenAllowance: number
  monthlyTokensUsed: number
  monthlyTokensRemaining: number
  packageTokenBalance: number
  totalTokensRemaining: number
  creditsEquivalentRemaining: number
  warnAtPercent: number
  usagePercent: number
  status: LlmQuotaStatus
  monthlyPeriod: string
  handwritingCredits: {
    monthlyFreeRemaining: number
    packageCredits: number
    totalAvailable: number
  }
  llmEnabled: boolean
  quotaBypassed?: boolean
}

export interface AvaReflectionOutcome {
  satisfactory: boolean
  issues: string[]
  severity: 'ok' | 'minor' | 'critical'
  revised: boolean
  attempts: number
  steps: string[]
}

export type AvaActivityKind = 'context' | 'tool' | 'llm' | 'reflection'
export type AvaActivityStatus = 'start' | 'done' | 'skip'

export interface AvaActivityEvent {
  code: string
  kind: AvaActivityKind
  status: AvaActivityStatus
  label: string
  ts: number
}

export interface AvaProposedAction {
  id: string
  type: string
  label: string
  description?: string
  payload: Record<string, unknown>
}

export interface AvaConversation {
  id: string
  accountId: string
  patientId: string
  healthThreadId: string | null
  title: string | null
  status: 'active' | 'archived'
  lastActivityAt: string
  createdAt: string
  updatedAt: string
}

export interface AvaChatResponse {
  reply: string
  provider: string
  model: string
  tier: 'free' | 'premium'
  conversationId?: string
  proposedActions?: AvaProposedAction[]
  usage: {
    tokensIn: number
    tokensOut: number
    tokensTotal: number
    usageSource: string
  }
  quota: LlmUsageQuota
  disclaimer: string
  insightsIncluded: number
  reflection: AvaReflectionOutcome
  activityTrace?: AvaActivityEvent[]
}

export interface AppAccount {
  authProvider: string
  authSubject: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthSyncResponse {
  account: AppAccount
  isNew: boolean
  needsProfile: boolean
}

export type LegalDocumentKind = 'terms_of_use' | 'privacy_policy' | 'cookie_policy' | 'minor_guardian_consent'

export interface ComplianceStatus {
  compliant: boolean
  requiredKinds: LegalDocumentKind[]
  pendingKinds: LegalDocumentKind[]
  acceptances: Array<{
    kind: LegalDocumentKind
    version: string
    acceptedAt: string
    documentId: string
  }>
}

export interface LegalDocumentWithContent {
  id: string
  kind: LegalDocumentKind
  version: string
  title: string
  summary: string | null
  content: string
  effectiveAt: string
  publishedAt: string
  requiresAcceptance: boolean
}

export interface FamilyInvite {
  id: string
  inviteeEmail: string
  patientIds: string[]
  careCircleId?: string | null
  accessLevel: string
  status: string
  expiresAt: string
}

export interface InvitePreview {
  inviteeEmail: string
  patientNames: string[]
  inviterDisplayName: string | null
  circleName?: string | null
  accessLevel: string
  status: string
  expiresAt: string
}

export interface ProfileShare {
  id: string
  patientId: string
  patientName: string
  ownerDisplayName?: string | null
  targetAccountEmail: string
  targetCircleId?: string | null
  targetCircleName?: string | null
  status: string
  expiresAt: string
}

export interface CareCircleSummary {
  id: string
  name: string
  memberRole?: string
}

export interface CareCircleDetail extends CareCircleSummary {
  memberRole: string
  members: Array<{
    id: string
    accountId: string
    role: string
    email?: string | null
    displayName?: string | null
  }>
  patients: Array<{ patientId: string; patientName: string; linkKind?: string }>
}

export interface OwnedPatient {
  id: string
  name: string
}

export interface IntegrationLink {
  id: string
  patientId: string
  portalType: string
  email: string | null
  cardNumber: string | null
  active: boolean
  lastSyncAt: string | null
  sessionExpiresAt?: string | null
  createdAt: string
  updatedAt: string
  syncAuthority?: 'self' | 'titular'
  effectiveSyncLinkId?: string
  managedByPatientId?: string
  managedByPatientName?: string
  effectiveLastSyncAt?: string | null
  effectiveSessionExpiresAt?: string | null
  sessionReady?: boolean
  syncDegraded?: boolean
  authAttention?: 'none' | 'credentials' | 'session'
}

export interface SyncNoveltySummary {
  portalExams?: number
  portalAttendances?: number
  portalMedicalRecords?: number
  portalAuthorizations?: number
  newExamRecords?: number
  skippedExamRecords?: number
  skippedMedicalRecords?: number
  skippedAuthorizations?: number
  filesDownloaded?: number
  filesSkipped?: number
  newAuthorizations?: number
  updatedAuthorizations?: number
  newMedicalRecords?: number
}

export interface SyncJobStatusPayload {
  id: string
  status: 'pending' | 'running' | 'success' | 'failed'
  step: string | null
  message: string | null
  result: { novelty?: SyncNoveltySummary } | null
  novelty: SyncNoveltySummary | null
  error: string | null
  startedAt: string
  finishedAt: string | null
  portalType: string
}

export interface IntegrationLinkSyncStatus {
  activeJob: SyncJobStatusPayload | null
  lastJob: SyncJobStatusPayload | null
}
