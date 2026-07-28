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

export interface Medication {
  id: string
  patientId: string
  medicalRecordId: string | null
  genericName: string
  brandName: string | null
  dosage: string | null
  frequency: string | null
  route: string | null
  startDate: string | null
  endDate: string | null
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
  uploadedAt: string
  suggestedPatient?: SuggestedPatientFields
  isIdentityDocument?: boolean
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
  createdAt: string
  updatedAt: string
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
}
