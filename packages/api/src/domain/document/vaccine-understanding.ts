export interface VaccineCardEntry {
  vaccineName: string
  doseNumber?: string | null
  applicationDate?: string | null
  batchNumber?: string | null
  appliedBy?: string | null
  clinic?: string | null
  handwrittenNotes?: string | null
  confidence?: number | null
}

export interface VaccineCardUnderstanding {
  entries: VaccineCardEntry[]
  rawTranscription: string
  warnings: string[]
  provider: string
  tier?: 'free' | 'premium'
}

export interface VaccineCardUnderstandingPort {
  interpretVaccineCard(
    buffer: Buffer,
    mimeType: string,
    opts?: { tier: 'free' | 'premium'; ocrText?: string | null },
  ): Promise<VaccineCardUnderstanding>
}
