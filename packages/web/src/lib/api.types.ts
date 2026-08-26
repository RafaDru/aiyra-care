export interface Patient {
  id: string
  name: string
  birthDate: string
  gender: 'male' | 'female' | null
  bloodType: string | null
  weightKg: number | null
  heightCm: number | null
  photoUrl: string | null
  parentIds: string[]
  cpf: string | null
  cns: string | null
  ageCategory: 'children' | 'adolescents' | 'adults'
  createdAt: string
  updatedAt: string
  membershipRole?: string
  isSelf?: boolean
}

export type PatientContextAlertSeverity = 'info' | 'warning' | 'critical'

export interface PatientContext {
  patientId: string
  generatedAt: string
  identity: {
    name: string
    birthDate: string
    ageYears: number
    ageCategory: 'children' | 'adolescents' | 'adults'
    gender: string | null
    bloodType: string | null
    weightKg: number | null
    heightCm: number | null
    parents: Array<{ id: string; name: string }>
  }
  alerts: Array<{
    severity: PatientContextAlertSeverity
    kind: string
    title: string
    detail?: string
  }>
  timeline: Array<{
    date: string
    kind: string
    title: string
    subtitle?: string
    source: string
    entityId?: string
    count?: number
    items?: Array<{
      date: string
      title: string
      subtitle?: string
      source: string
      entityId?: string
      examOrderId?: string
    }>
    examOrderId?: string
  }>
  pendencies: Array<{
    kind: string
    title: string
    detail?: string
    threadId?: string
  }>
  integrations: Array<{
    portalType: string
    linkId: string
    lastSyncAt: string | null
    syncAuthority?: 'self' | 'titular'
    effectiveSyncLinkId?: string
    managedByPatientId?: string
    managedByPatientName?: string
  }>
  planMemberships: Array<{
    operator: string
    planName: string
    memberNumber: string | null
    role: string
    status: string
  }>
  activeThreads: Array<{
    id: string
    kind: string
    title: string
    status: string
    summary: string | null
    updatedAt: string
    dueDate: string | null
    priority: string
    linkCount: number
  }>
  textSummary: string
}

export interface PatientClinicalExportSections {
  allergies: Array<{ allergen: string; severity: string | null; reaction: string | null }>
  medications: Array<{ name: string; dose: string | null; frequency: string | null }>
  vaccines: Array<{ name: string; administeredAt: string | null; doseLabel: string | null }>
  diagnoses: Array<{ code: string | null; description: string; diagnosedAt: string | null }>
  documents: Array<{ filename: string; type: string; uploadedAt: string; ocrProcessed: boolean }>
  authorizations: Array<{ title: string; date: string | null; status: string }>
  medicalRecords: Array<{ date: string; description: string | null; doctor: string | null }>
  exams: Array<{ name: string; date: string; laboratory: string | null }>
}

export interface PatientClinicalExport {
  mode: 'summary' | 'full'
  context: PatientContext
  fullSections?: PatientClinicalExportSections
}

export interface PatientTimelineItem {
  date: string
  title: string
  subtitle?: string
  source: string
  entityId?: string
  examOrderId?: string
}

export interface PatientTimelineEvent {
  date: string
  kind: string
  title: string
  subtitle?: string
  source: string
  entityId?: string
  count?: number
  items?: PatientTimelineItem[]
  examOrderId?: string
}

export interface PatientTimeline {
  patientId: string
  generatedAt: string
  events: PatientTimelineEvent[]
  total: number
}

export interface PatientTimelineQuery {
  timelineMonths?: number
  kinds?: string[]
  sources?: string[]
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export type HealthThreadKind = 'acompanhamento' | 'task' | 'investigation' | 'hypothesis' | 'episode'
export type HealthThreadStatus = 'open' | 'active' | 'paused' | 'resolved' | 'ruled_out' | 'converted'

export type HealthThreadPriority = 'low' | 'normal' | 'high'

export interface HealthThread {
  id: string
  patientId: string
  kind: HealthThreadKind
  title: string
  summary: string | null
  status: HealthThreadStatus
  priority: HealthThreadPriority
  confidence: 'low' | 'medium' | 'high' | null
  startedAt: string | null
  endedAt: string | null
  dueDate: string | null
  createdBy: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface HealthThreadTimelineItem {
  kind: 'entry' | 'link'
  id: string
  occurredAt: string
  linkedAt?: string
  entryType?: string
  body?: string
  linkRole?: string
  entityType?: string
  entityId?: string
  artifact?: {
    entityType: string
    entityId: string
    title: string
    subtitle?: string
    date?: string
  }
}

export interface HealthThreadDetail {
  thread: HealthThread
  entries: Array<{
    id: string
    threadId: string
    entryType: string
    body: string
    occurredAt: string
    createdBy: string | null
    createdAt: string
  }>
  links: Array<{
    id: string
    threadId: string
    entityType: string
    entityId: string
    role: string
    label: string | null
    createdAt: string
  }>
  timeline: HealthThreadTimelineItem[]
}

export type ClinicalEntityType =
  | 'exam'
  | 'medical_record'
  | 'authorization'
  | 'medication'
  | 'diagnosis'
  | 'vaccine'
  | 'health_thread'

export interface RelationType {
  code: string
  label: string
  fromEntityType: string
  toEntityType: string
  neo4jRelType: string
  description: string | null
  inverseLabel: string | null
}

export interface ClinicalEntityLink {
  id: string
  patientId: string
  fromEntityType: ClinicalEntityType
  fromEntityId: string
  toEntityType: ClinicalEntityType
  toEntityId: string
  relationCode: string
  label: string | null
  healthThreadId: string | null
  metadata: Record<string, unknown>
  createdBy: string | null
  createdAt: string
  relationLabel?: string
  neo4jRelType?: string
  /** Quando a lista é filtrada por entidade: sentido da relação para o peer. */
  direction?: 'outgoing' | 'incoming'
  /** Resumo da outra entidade no vínculo (para UI e navegação). */
  peerEntity?: {
    entityType: ClinicalEntityType
    entityId: string
    title: string
    subtitle?: string
    date?: string
  }
}

export interface ClinicalFlowNode {
  entityType: ClinicalEntityType
  entityId: string
  title: string
  subtitle?: string
  date?: string
  inThread?: boolean
}

export interface ClinicalFlowEdge {
  id: string
  relationCode: string
  relationLabel: string
  neo4jRelType: string
  fromEntityType: ClinicalEntityType
  fromEntityId: string
  toEntityType: ClinicalEntityType
  toEntityId: string
  label: string | null
}

export interface ClinicalFlow {
  nodes: ClinicalFlowNode[]
  edges: ClinicalFlowEdge[]
}

export interface ClinicalLinkCount {
  entityType: string
  entityId: string
  count: number
}

/** Contexto do projeto para LLM/agentes — GET /project/context */
export interface ProjectContext {
  schemaVersion: number
  generatedAt: string
  textSummary: string
  application: {
    name: string
    repository: string
    stack: string[]
    localUrls: { api: string; web: string }
    patientsFocus: string[]
  }
  architecture: {
    pattern: string
    postgresRole: string
    neo4jRole: string
    principle: string
  }
  layers: Array<{
    id: string
    name: string
    description: string
    usesLlm: boolean
    status: string
  }>
  domains: Array<{ name: string; table?: string; description: string }>
  apiRoutes: Array<{ method: string; path: string; description: string }>
  integrations: Array<{
    portal: string
    syncAutomatic: boolean
    authMethod: string
    imports: string[]
  }>
  healthThreads: {
    kinds: string[]
    linkRoles: string[]
    linkEntityTypes: string[]
    workflowNotes: string[]
  }
  relationCatalog: {
    status: string
    summary: string
    plannedTables: string[]
    separation: { threadEntity: string; entityEntity: string }
  }
  decisions: Array<{
    id: string
    date?: string
    title: string
    decision: string
    rationale: string
    status: string
  }>
  plannedWork: Array<{ id: string; title: string; status: string; notes?: string }>
  documentationSources: Array<{ path: string; role: string; format: string }>
  migrations: string[]
  historico: {
    sessionCount: number
    sessions: Array<{
      date: string
      title: string
      description?: string
      sections: Array<{ heading: string; items: Array<{ text: string; done: boolean }> }>
    }>
    latestSession?: {
      date: string
      title: string
      description?: string
      sections: Array<{ heading: string; items: Array<{ text: string; done: boolean }> }>
    }
  }
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

export type PreferredContact = 'email' | 'phone' | 'whatsapp'

export interface AccountProfileFields {
  fullName: string | null
  phone: string | null
  phoneSecondary: string | null
  whatsapp: string | null
  cpf: string | null
  birthDate: string | null
  gender: string | null
  city: string | null
  state: string | null
  country: string
  timezone: string | null
  locale: string | null
  bio: string | null
  websiteUrl: string | null
  linkedinUrl: string | null
  instagramUrl: string | null
  xUrl: string | null
  facebookUrl: string | null
  preferredContact: PreferredContact | null
  updatedAt: string | null
}

export interface AccountProfileView {
  accountId: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  profile: AccountProfileFields
}

export interface UpdateAccountProfileInput {
  fullName?: string
  phone?: string
  phoneSecondary?: string
  whatsapp?: string
  cpf?: string
  birthDate?: string
  gender?: 'male' | 'female' | 'other' | 'prefer_not'
  city?: string
  state?: string
  country?: string
  timezone?: string
  locale?: string
  bio?: string
  websiteUrl?: string
  linkedinUrl?: string
  instagramUrl?: string
  xUrl?: string
  facebookUrl?: string
  preferredContact?: PreferredContact
}

export interface GrowthRecord {
  id: string
  patientId: string
  recordDate: string
  weightKg: number | null
  heightCm: number | null
  headCircumferenceCm: number | null
  bmi: number | null
  percentileWeight: number | null
  percentileHeight: number | null
  notes: string | null
  createdAt: string
}

export interface MeasurementType {
  code: string
  category: string
  labelKey: string
  defaultUnit: string | null
  valueKind: string
  precision: number
  normalRange: Record<string, number> | null
  chartConfig: Record<string, unknown>
  sortOrder: number
  active: boolean
}

export interface MeasurementObservation {
  id: string
  patientId: string
  typeCode: string
  observedAt: string
  valueNumeric: number | null
  valueSecondary: number | null
  unit: string | null
  source: string
  sourceRef: string | null
  healthThreadId: string | null
  context: Record<string, unknown>
  notes: string | null
  createdAt: string
}

export interface MeasurementChartSeriesPayload {
  typeCode: string
  labelKey: string
  category: string
  unit: string | null
  valueKind: string
  chartConfig: Record<string, unknown>
  normalRange: Record<string, number> | null
  points: Array<{
    id?: string
    observedAt: string
    value: number | null
    valueSecondary: number | null
    notes: string | null
    healthThreadId: string | null
    source?: string
    sourceRef?: string | null
  }>
}

export interface WhoGrowthPayload {
  typeCode: 'weight' | 'height' | 'head_circumference'
  unit: string
  gender: 'male' | 'female'
  percentilesAvailable: true
  patientPoints: Array<{
    ageMonths: number
    value: number
    observedAt: string
    percentile: number | null
    observationId?: string
  }>
  referenceCurve: Array<{ ageMonths: number; p3: number; p50: number; p97: number }>
}

export interface GlucoseImportResult {
  imported: number
  skipped: number
  examIds: string[]
}

export type FamilySupportInsightKind =
  | 'vital_alert'
  | 'medication_safety'
  | 'discuss_with_doctor'
  | 'consult_prep'

export type FamilySupportAction =
  | 'verify_reading'
  | 'discuss_with_doctor'
  | 'seek_medical_care'
  | 'inform_doctor'
  | 'review_before_dose'
  | 'do_not_apply'

export interface FamilySupportCitation {
  kind: 'measurement' | 'allergy' | 'medication' | 'health_thread'
  entityId?: string
  label: string
  observedAt?: string
}

export interface FamilySupportInsight {
  id: string
  kind: FamilySupportInsightKind
  action: FamilySupportAction
  priority: 'info' | 'attention' | 'urgent' | 'critical'
  title: string
  message: string
  citations: FamilySupportCitation[]
  audience: 'family' | 'clinical'
}

export interface FamilySupportBundle {
  disclaimer: string
  insights: FamilySupportInsight[]
  generatedAt: string
  patientId: string
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

export interface AvaMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  documentId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AvaSessionPin {
  id: string
  conversationId: string
  entityType: 'exam' | 'exam_order' | 'exam_result_item' | 'exam_marker'
  entityId: string
  patientId: string
  label: string | null
  source: 'user' | 'accelerator' | 'auto' | 'inferred'
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AvaChatResponse {
  reply: string
  provider: string
  model: string
  tier: 'free' | 'premium'
  conversationId?: string
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

export type EmergencyDirectoryCategory =
  | 'medical'
  | 'fire_rescue'
  | 'police'
  | 'poison'
  | 'mental_health'
  | 'violence_support'
  | 'human_rights'
  | 'venomous_animal'
  | 'civil_defense'
  | 'insurance'
  | 'other'

export interface EmergencyDirectoryEntry {
  id: string
  category: EmergencyDirectoryCategory
  scope: 'national' | 'state' | 'city'
  stateCode: string | null
  cityName: string | null
  name: string
  phone: string
  phoneAlt: string | null
  description: string | null
  instructions: string | null
  sourceUrl: string | null
  officialOrg: string | null
  available24h: boolean
  sortOrder: number
}

export interface PatientEmergencyContact {
  id: string
  patientId: string
  name: string
  phone: string
  phoneAlt: string | null
  relationship: string | null
  notes: string | null
  sortOrder: number
  deletedAt: string | null
  deletedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface MedicationAdministrationRow {
  id: string
  patientId: string
  medicationId: string | null
  medicationName: string
  administeredAt: string
  doseGiven: string | null
  healthThreadId: string | null
  notes: string | null
  createdAt: string
}

export interface MonitoringTimelineRow {
  kind: 'measurement' | 'medication' | 'symptom'
  at: string
  id: string
  labelKey: string
  display: string
  healthThreadId: string | null
  notes: string | null
}

export interface CareReminderRow {
  id: string
  patientId: string
  healthThreadId: string | null
  reminderKind: 'measurement' | 'medication'
  targetCode: string | null
  medicationName: string | null
  title: string
  intervalMinutes: number
  nextFireAt: string
  lastCompletedAt: string | null
  active: boolean
  doseHint: string | null
  createdAt: string
  updatedAt: string
}

export interface MonitoringExportReport {
  generatedAt: string
  patientId: string
  patientName: string | null
  healthThreadId: string | null
  threadTitle: string | null
  timeline: MonitoringTimelineRow[]
  series: MeasurementChartSeriesPayload[]
  stats: Array<{
    typeCode: string
    labelKey: string
    unit: string | null
    count: number
    min: number | null
    max: number | null
    last: number | null
    lastAt: string | null
  }>
  alerts: Array<{ typeCode: string; labelKey: string; value: number; message: string }>
}

export interface OcrStatsRow {
  document_type: string
  total: number
  ocr_ok: number
  parse_ok: number
  paid_count: number
  avg_quality: number | null
}

export interface OcrStats {
  summary: {
    total?: number
    ocr_ok?: number
    parse_ok?: number
    paid_count?: number
    avg_quality?: number | null
  }
  byType: OcrStatsRow[]
}

export type ScheduledEventKind = 'appointment' | 'reminder' | 'task'
export type ScheduledEventStatus = 'planned' | 'done' | 'cancelled'
export type ScheduledEventSource = 'local' | 'ics_import' | 'google' | 'microsoft'

export interface ScheduledEvent {
  id: string
  patientId: string
  healthThreadId: string | null
  title: string
  description: string | null
  scheduledAt: string
  endAt: string | null
  kind: ScheduledEventKind
  status: ScheduledEventStatus
  source: ScheduledEventSource
  externalUid: string | null
  sourceLabel: string | null
  createdAt: string
  updatedAt: string
}

export interface IcsImportResult {
  imported: number
  skippedDuplicate: number
  skippedInvalid: number
  totalParsed: number
}

export interface GoogleCalendarStatus {
  connected: boolean
  configured: boolean
  id?: string
  calendarId?: string
  calendarLabel?: string | null
  lastSyncAt?: string | null
}

export interface GoogleCalendarSyncResult {
  pull: IcsImportResult
  pushed: number
  pushFailed: number
}

export interface BillingPackageOffer {
  id: string
  credits: number
  amountCents: number
  currency: string
  label: string
  stripePriceId?: string
}

export interface BillingOffers {
  stripeEnabled: boolean
  packages: BillingPackageOffer[]
  familyPlan: {
    tier: string
    monthlyFreeAllowance: number
    stripePriceId: string | null
  }
}

export interface BillingPurchase {
  id: string
  accountId: string
  stripeSessionId: string | null
  packageCredits: number
  amountCents: number
  currency: string
  status: string
  createdAt: string
  completedAt: string | null
}

export interface AccountEntitlement {
  accountId: string
  planTier: 'free' | 'family'
  monthlyFreeAllowance: number
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  subscriptionStatus: string | null
  subscriptionCurrentPeriodEnd: string | null
  subscriptionCancelAtPeriodEnd: boolean
}

export interface BillingMe {
  entitlement: AccountEntitlement
  quota: HandwritingQuota
  purchases: BillingPurchase[]
  canExportBilling?: boolean
}

export type LegalDocumentKind = 'terms_of_use' | 'privacy_policy' | 'cookie_policy' | 'minor_guardian_consent'

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

export interface CarePlace {
  id: string
  displayName: string
  normalizedName: string
  usageCount: number
  firstSeenAt: string
  lastUsedAt: string
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

export interface ExamMarker {
  id: string
  examId: string
  patientId: string
  markerName: string
  technicalName: string | null
  numericValue: number | null
  displayValue: string
  unit: string | null
  referenceRange: string | null
  status: 'normal' | 'altered' | 'critical'
  collectedAt: string
  createdAt: string
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

export interface ExamOrder {
  id: string
  patientId: string
  externalKey: string
  source: string
  portalOrderId: string | null
  orderDate: string | null
  laboratory: string | null
  resultFileUrl: string | null
  documentId: string | null
  notes: string | null
  createdAt: string
}

export interface SuggestedPatientFields {
  cpf?: string
  name?: string
  birthDate?: string
  motherName?: string
  fatherName?: string
}

export interface OcrRegion {
  id: string
  text: string
  left: number
  top: number
  width: number
  height: number
  confidence?: number
  lineIndex?: number
}

export interface OcrLayout {
  imageWidth: number
  imageHeight: number
  regions: OcrRegion[]
}

export interface Document_ {
  id: string
  patientId: string
  documentType:
    | 'prescription'
    | 'exam'
    | 'report'
    | 'vaccine_card'
    | 'other'
    | 'certidao_nascimento'
    | 'rg'
    | 'cpf_card'
    | 'cnh'
  originalFilename: string
  storagePath: string
  fileSizeBytes: number | null
  mimeType: string | null
  extractedText: string | null
  ocrProcessed: boolean
  ocrProvider?: string | null
  ocrQualityScore?: number | null
  ocrUsedPaid?: boolean
  ocrParseOk?: boolean | null
  ocrFieldsFound?: number | null
  ocrFieldsExpected?: number | null
  ocrLayout?: OcrLayout | null
  uploadedAt: string
  suggestedPatient?: SuggestedPatientFields
  isIdentityDocument?: boolean
}

export interface PrescriptionInterpretationItem {
  medication: string
  dose?: string | null
  route?: string | null
  frequency?: string | null
  duration?: string | null
  instructions?: string | null
  confidence?: number | null
}

export interface PrescriptionInterpretation {
  patientName?: string | null
  doctorName?: string | null
  doctorCrm?: string | null
  issueDate?: string | null
  clinicName?: string | null
  items: PrescriptionInterpretationItem[]
  rawTranscription: string
  warnings: string[]
  provider: string
  tier?: 'free' | 'premium'
}

export interface VaccineCardInterpretationEntry {
  vaccineName: string
  doseNumber?: string | null
  applicationDate?: string | null
  batchNumber?: string | null
  appliedBy?: string | null
  clinic?: string | null
  handwrittenNotes?: string | null
  confidence?: number | null
}

export interface VaccineCardInterpretation {
  entries: VaccineCardInterpretationEntry[]
  rawTranscription: string
  warnings: string[]
  provider: string
  tier?: 'free' | 'premium'
  interpretationKind?: 'vaccine_card'
}

export interface HandwritingQuota {
  scopeId: string
  monthlyFreeAllowance: number
  monthlyFreeRemaining: number
  packageCredits: number
  totalAvailable: number
  monthlyPeriod: string
  interpretationEnabled: boolean
  pricing?: HandwritingPricingInfo
}

export interface HandwritingPricingInfo {
  freeTierLabel: string
  freeTierProviders: string[]
  premiumTierLabel: string
  premiumTierProviders: string[]
  monthlyFreeUsesFreeTierOnly: boolean
  packageUsesPremiumFallback: boolean
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

export interface ScrapedVaccine {
  vaccineName: string
  dose: string
  applicationDate: string
  nextDoseDate?: string
  batch?: string
  appliedBy?: string
  clinic?: string
}

export interface ScrapedExam {
  examType: string
  examDate: string
  description?: string
  attachedFiles?: number
  results?: string
}

export interface ScrapedPrescription {
  medicationName: string
  dosage?: string
  duration?: string
  doctorName?: string
  prescriptionDate: string
}

export interface SessionItem {
  text: string
  done: boolean
}

export interface SessionSection {
  heading: string
  items: SessionItem[]
}

export interface Session {
  date: string
  title: string
  description?: string
  sections: SessionSection[]
}

export interface AuthorizationItem {
  id: string
  authorizationId: string
  procedureCode: string | null
  procedureDescription: string
  quantityRequested: number | null
  quantityAuthorized: number | null
  status: string | null
  externalProcedureId: string | null
  sortOrder: number
  createdAt: string
}

export interface Authorization {
  id: string
  patientId: string
  procedureCode: string | null
  procedureDescription: string | null
  doctorName: string | null
  doctorCouncil: string | null
  clinicName: string | null
  authorizationDate: string | null
  validityDate: string | null
  status: string
  guideNumber: string | null
  quantity: number | null
  notes: string | null
  source: string
  solicitationNumber: string | null
  guidePassword: string | null
  specialty: string | null
  solicitationUrl: string | null
  solicId: string | null
  solicIdEncrypted: string | null
  authorizationType: string | null
  classification: string | null
  localAddress: string | null
  localPhone: string | null
  locations: Array<{
    formattedAddress?: string
    phone?: string
    city?: string
    state?: string
    latitude?: string
    longitude?: string
  }> | null
  history: Array<{
    code?: string
    description?: string
    occurredAt?: string
    auditorName?: string
  }> | null
  items: AuthorizationItem[]
  medicalRecordId: string | null
  providerExternalId: string | null
  doctorPhotoUrl: string | null
  guideDocumentId: string | null
  createdAt: string
  updatedAt: string
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
  /** self = sync neste vínculo; titular = plano atualizado pelo vínculo de outro paciente (ex. Amil). */
  syncAuthority?: 'self' | 'titular'
  effectiveSyncLinkId?: string
  managedByPatientId?: string
  managedByPatientName?: string
  effectiveLastSyncAt?: string | null
  effectiveSessionExpiresAt?: string | null
  /** Sessão persistida válida — sync silencioso permitido sem abrir browser de login. */
  sessionReady?: boolean
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
  stepDetails: Record<string, { status: string; message: string }>
  result: {
    exams: number
    medicalRecords: number
    authorizations: number
    authorizationItems: number
    updatedAuthorizations: number
    total: number
    warnings?: string[]
    novelty?: SyncNoveltySummary
    authorizationDetails: Array<{
      solicitationNumber?: string
      classification?: string
      doctorName?: string
      itemCount: number
      action: 'created' | 'updated'
      linkedConsultaId?: string
      linkedConsultaDate?: string
      beneficiaryName?: string
    }>
    beneficiaryDetails?: Array<{
      name: string
      marcaOtica: string
      role: 'holder' | 'dependent'
      matched: boolean
      patientId?: string
      patientName?: string
      authorizationsImported: number
      authorizationsUpdated: number
    }>
    unmatchedBeneficiaries?: Array<{
      name: string
      marcaOtica: string
      cpf?: string
      cns?: string
      birthDate?: string
      role: 'holder' | 'dependent'
      authorizationCount: number
    }>
  } | null
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

export interface UnimedVirtualCard {
  token: string
  qrCode: string
  expiresAt: string | null
  cardNumber: string
  holderName: string
  productCode: string | null
  planName: string | null
  operatorName?: string | null
  networkName?: string | null
  segmentation?: string | null
  accommodation?: string | null
  geographicCoverage?: string | null
  regulationType?: string | null
  contractType?: string | null
  contractorName?: string | null
  cns?: string | null
  inclusionDate?: string | null
  cardValidFrom?: string | null
  cardValidTo?: string | null
  addOns?: Array<{ code?: string; description: string; includedAt?: string }>
  externalKey?: string
  plan?: InsurancePlan
  membership?: PlanMembership
}

export interface InsurancePlan {
  id: string
  operator: string
  operatorName: string | null
  planName: string
  productCode: string | null
  networkName: string | null
  networkCode: string | null
  segmentation: string | null
  accommodation: string | null
  geographicCoverage: string | null
  regulationType: string | null
  contractType: string | null
  contractorName: string | null
  addOns: Array<{ code?: string; description: string; includedAt?: string }>
  waitingPeriods: Array<{ description: string; endsAt?: string; group?: string }>
  externalKey: string
  source: string
  createdAt: string
  updatedAt: string
}

export interface PlanMembership {
  id: string
  patientId: string
  insurancePlanId: string
  integrationLinkId: string | null
  memberNumber: string | null
  role: string
  status: string
  cns: string | null
  inclusionDate: string | null
  cardValidFrom: string | null
  cardValidTo: string | null
  source: string
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PlanMembershipWithPlan extends PlanMembership {
  plan: InsurancePlan | null
}

export interface ScraperResult {
  patientName?: string
  patientBirthDate?: string
  patientCpf?: string
  patientCns?: string
  vaccines: ScrapedVaccine[]
  exams: ScrapedExam[]
  prescriptions: ScrapedPrescription[]
  rawPages: string[]
  familyMembers?: ScrapedFamilyMember[]
  vaccineSchedule?: ScrapedVaccineScheduleItem[]
  developmentMilestones?: ScrapedDevelopmentMilestone[]
  clinicalHistory?: ScrapedClinicalRecord[]
  responsibleCpf?: string
  sourcePortal?: 'conectesus' | 'caderneta'
  childBundles?: ScrapedChildImportBundle[]
}

export interface ScrapedChildImportBundle {
  member: ScrapedFamilyMember
  vaccines: ScrapedVaccine[]
  vaccineSchedule?: ScrapedVaccineScheduleItem[]
  developmentMilestones?: ScrapedDevelopmentMilestone[]
  clinicalHistory?: ScrapedClinicalRecord[]
}

export interface ScrapedFamilyMember {
  id?: string
  name?: string
  cpf?: string
  cns?: string
  birthDate?: string
  gender?: string
}

export interface ScrapedVaccineScheduleItem {
  vaccineCode?: string
  vaccineName: string
  doseLabel?: string
  doseNumber?: number
  status: 'applied' | 'pending' | 'overdue' | 'unknown'
  expectedAgeMonths?: number
  expectedDate?: string
  applicationDate?: string
  nextDoseDate?: string
  batch?: string
  appliedBy?: string
  clinic?: string
  notes?: string
  externalKey?: string
}

export interface ScrapedDevelopmentMilestone {
  title: string
  category?: string
  status: 'achieved' | 'pending' | 'attention' | 'unknown'
  expectedAgeMonths?: number
  achievedDate?: string
  notes?: string
  externalKey?: string
}

export interface ScrapedClinicalRecord {
  title: string
  date?: string
  description?: string
  category?: string
}

export interface VaccineScheduleItem {
  id: string
  patient_id: string
  vaccine_code: string | null
  vaccine_name: string
  dose_label: string | null
  dose_number: number | null
  status: string
  expected_age_months: number | null
  expected_date: string | null
  application_date: string | null
  next_dose_date: string | null
  batch_number: string | null
  applied_by: string | null
  clinic: string | null
  notes: string | null
  source: string
  external_key: string | null
  catalog_slot_key: string | null
  match_method: string | null
  match_score: number | null
}

export interface DevelopmentMilestone {
  id: string
  patient_id: string
  title: string
  category: string | null
  status: string
  expected_age_months: number | null
  achieved_date: string | null
  notes: string | null
  source: string
}

export interface CadernetaImportResult {
  importedVaccines: number
  importedSchedule: number
  importedMilestones: number
  importedClinical: number
  skipped: number
}

export type CadernetaMatchReason = 'cpf' | 'cns' | 'birth_date_name' | 'name_only' | 'unmatched'

export interface CadernetaFamilyImportPlan {
  anchorPatientId: string
  responsibleCpf?: string
  familyPatientIds: string[]
  matches: Array<{
    patientId: string
    patientName: string
    bundle: ScrapedChildImportBundle
    matchReason: CadernetaMatchReason
  }>
  unmatched: Array<{
    bundle: ScrapedChildImportBundle
    reason: string
  }>
}

export interface CadernetaFamilyImportResult {
  plan: CadernetaFamilyImportPlan
  byPatient: Array<{ patientId: string; patientName: string; result: CadernetaImportResult }>
  totals: CadernetaImportResult
}
