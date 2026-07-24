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
  createdAt: string
}

export interface Document_ {
  id: string
  patientId: string
  documentType: 'prescription' | 'exam' | 'report' | 'vaccine_card' | 'other'
  originalFilename: string
  storagePath: string
  fileSizeBytes: number | null
  mimeType: string | null
  extractedText: string | null
  ocrProcessed: boolean
  uploadedAt: string
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
