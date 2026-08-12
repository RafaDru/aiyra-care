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

export interface PatientTimelineEvent {
  date: string
  kind: string
  title: string
  subtitle?: string
  source: string
  entityId?: string
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

export type HealthThreadKind = 'task' | 'investigation' | 'hypothesis' | 'episode'
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
  examType: string
  examDate: string
  resultSummary: string | null
  resultFileUrl: string | null
  laboratory: string | null
  notes: string | null
  source: string
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
