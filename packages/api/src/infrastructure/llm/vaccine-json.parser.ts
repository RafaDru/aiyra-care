import type { VaccineCardEntry, VaccineCardUnderstanding } from '../../domain/document/vaccine-understanding.js'

type ParsedJson = Omit<VaccineCardUnderstanding, 'provider'>

function normalizeEntry(raw: VaccineCardEntry): VaccineCardEntry {
  return {
    vaccineName: String(raw.vaccineName ?? '').trim(),
    doseNumber: raw.doseNumber ?? null,
    applicationDate: raw.applicationDate ?? null,
    batchNumber: raw.batchNumber ?? null,
    appliedBy: raw.appliedBy ?? null,
    clinic: raw.clinic ?? null,
    handwrittenNotes: raw.handwrittenNotes ?? null,
    confidence: raw.confidence ?? null,
  }
}

export function parseVaccineCardUnderstandingJson(text: string): ParsedJson {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const parsed = JSON.parse(cleaned) as ParsedJson
  return {
    entries: Array.isArray(parsed.entries)
      ? parsed.entries.map(normalizeEntry).filter((e) => e.vaccineName)
      : [],
    rawTranscription: parsed.rawTranscription ?? '',
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [],
  }
}
