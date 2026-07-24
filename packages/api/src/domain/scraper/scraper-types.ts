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
