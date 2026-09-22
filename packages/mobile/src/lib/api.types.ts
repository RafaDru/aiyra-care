export interface Patient {
  id: string
  name: string
  birthDate: string
  gender: 'male' | 'female' | null
  bloodType: string | null
  cpf?: string | null
  cns?: string | null
  weightKg?: number | null
  heightCm?: number | null
  ageCategory: 'children' | 'adolescents' | 'adults'
  isSelf?: boolean
  membershipRole?: 'self' | 'guardian' | string
  createdAt: string
  updatedAt: string
}

export type PatientDocumentType =
  | 'prescription'
  | 'exam'
  | 'report'
  | 'vaccine_card'
  | 'other'
  | 'certidao_nascimento'
  | 'rg'
  | 'cpf_card'
  | 'cnh'

export interface PatientDocument {
  id: string
  patientId: string
  documentType: PatientDocumentType
  originalFilename: string
  fileSizeBytes: number | null
  mimeType: string | null
  createdAt: string
}

export interface PatientAccessGrant {
  id: string
  accountId: string
  accessLevel: string
  membershipRole: string
  email?: string | null
  displayName?: string | null
}

export interface InsurancePlan {
  id: string
  operator: string
  operatorName: string | null
  planName: string
  productCode: string | null
  networkName: string | null
}

export interface PlanMembership {
  id: string
  patientId: string
  insurancePlanId: string
  integrationLinkId: string | null
  memberNumber: string | null
  role: string
  status: string
  source: string
  lastSyncedAt: string | null
}

export interface PlanMembershipWithPlan extends PlanMembership {
  plan: InsurancePlan | null
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

export interface CompleteProfileInput {
  name: string
  birthDate: string
  gender: 'male' | 'female'
  cpf: string
  cns?: string
  weightKg?: number
  heightCm?: number
}

export type ScheduledEventKind = 'appointment' | 'reminder' | 'task'
export type ScheduledEventStatus = 'planned' | 'done' | 'cancelled'

export interface ScheduledEvent {
  id: string
  patientId: string
  title: string
  description: string | null
  scheduledAt: string
  endAt: string | null
  kind: ScheduledEventKind
  status: ScheduledEventStatus
  source: string
  sourceLabel: string | null
}

export interface CreatePatientInput {
  name: string
  birthDate: string
  gender?: 'male' | 'female'
  cpf?: string
  cns?: string
  weightKg?: number
  heightCm?: number
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

export interface MarkerTrendPoint {
  collectedAt: string
  numericValue: number | null
  displayValue: string
  unit: string | null
  status: string
  examId: string
}

export interface MarkerTrendGroup {
  markerName: string
  technicalName?: string
  unit?: string
  referenceRange?: string
  refLow?: number
  refHigh?: number
  latestValue: string
  latestStatus: string
  latestCollectedAt: string
  points: MarkerTrendPoint[]
}

export interface Exam {
  id: string
  patientId: string
  medicalRecordId: string | null
  examOrderId: string | null
  examType: string
  examDate: string
  resultSummary: string | null
  resultFileUrl: string | null
  laboratory: string | null
  notes: string | null
  source: string
  createdAt: string
}

export interface Medication {
  id: string
  patientId: string
  medicalRecordId: string | null
  genericName: string
  brandName: string | null
  dosage: string | null
  frequency: string | null
  route: string | null
  duration: string | null
  startDate: string | null
  startedAt: string | null
  endDate: string | null
  endDateIsProjected: boolean
  prescribingDoctor: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
}

export interface Allergy {
  id: string
  patientId: string
  allergen: string
  reaction: string | null
  severity: string | null
  diagnosedDate: string | null
  notes: string | null
  createdAt: string
}

export interface Diagnosis {
  id: string
  patientId: string
  medicalRecordId: string | null
  diagnosisCode: string | null
  diagnosisName: string
  description: string | null
  isChronic: boolean
  diagnosedDate: string | null
  status: string | null
  createdAt: string
}

export interface Authorization {
  id: string
  patientId: string
  procedureCode: string | null
  procedureDescription: string | null
  doctorName: string | null
  clinicName: string | null
  authorizationDate: string | null
  validityDate: string | null
  status: string
  guideNumber: string | null
  solicitationNumber: string | null
  specialty: string | null
  classification: string | null
  source: string
  notes: string | null
}

export interface MedicalRecord {
  id: string
  patientId: string
  recordDate: string
  recordType: string
  description: string | null
  doctorName: string | null
  doctorCrm: string | null
  specialty: string | null
  clinicName: string | null
  notes: string | null
  source: string
  invoiceNumber: string | null
  chargedAmount: number | null
  copartCompanyAmount: number | null
  copartBaseAmount: number | null
  providerExternalId: string | null
  procedureExternalId: string | null
  createdAt: string
}

export interface Vaccine {
  id: string
  patientId: string
  vaccineName: string
  doseNumber: number | null
  batchNumber: string | null
  applicationDate: string
  nextDoseDate: string | null
  appliedBy: string | null
  clinic: string | null
  notes: string | null
  source: string
  createdAt: string
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
