export interface ScrapedVaccine {
  vaccineName: string
  dose: string
  applicationDate: string
  nextDoseDate?: string
  batch?: string
  appliedBy?: string
  clinic?: string
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
  /** Payload original da API (RNDS / Caderneta). */
  rawJson?: Record<string, unknown>
}

export interface ScrapedDevelopmentMilestone {
  title: string
  category?: string
  status: 'achieved' | 'pending' | 'attention' | 'unknown'
  expectedAgeMonths?: number
  achievedDate?: string
  notes?: string
  externalKey?: string
  /** Payload original da API / portal. */
  rawJson?: Record<string, unknown>
}

export interface ScrapedClinicalRecord {
  title: string
  date?: string
  description?: string
  category?: string
}

/** Dados de uma criança na Caderneta, separados para importação por paciente. */
export interface ScrapedChildImportBundle {
  member: ScrapedFamilyMember
  vaccines: ScrapedVaccine[]
  vaccineSchedule: ScrapedVaccineScheduleItem[]
  developmentMilestones: ScrapedDevelopmentMilestone[]
  clinicalHistory: ScrapedClinicalRecord[]
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
  /** Um bundle por dependente da Minha Família (importação familiar). */
  childBundles?: ScrapedChildImportBundle[]
}
