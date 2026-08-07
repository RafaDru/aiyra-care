import type {
  PrescriptionItemUnderstanding,
  PrescriptionUnderstanding,
} from '../../domain/document/handwriting-understanding.js'

type ParsedJson = Omit<PrescriptionUnderstanding, 'provider'>

function normalizeItem(raw: PrescriptionItemUnderstanding): PrescriptionItemUnderstanding {
  return {
    medication: String(raw.medication ?? '').trim(),
    dose: raw.dose ?? null,
    route: raw.route ?? null,
    frequency: raw.frequency ?? null,
    duration: raw.duration ?? null,
    instructions: raw.instructions ?? null,
    confidence: raw.confidence ?? null,
  }
}

export function parsePrescriptionUnderstandingJson(text: string): ParsedJson {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const parsed = JSON.parse(cleaned) as ParsedJson
  return {
    patientName: parsed.patientName ?? null,
    doctorName: parsed.doctorName ?? null,
    doctorCrm: parsed.doctorCrm ?? null,
    issueDate: parsed.issueDate ?? null,
    clinicName: parsed.clinicName ?? null,
    items: Array.isArray(parsed.items) ? parsed.items.map(normalizeItem).filter((i) => i.medication) : [],
    rawTranscription: parsed.rawTranscription ?? '',
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [],
  }
}

export function isSatisfactoryInterpretation(result: PrescriptionUnderstanding): boolean {
  if (result.items.length > 0) return true
  if (result.rawTranscription.trim().length >= 80) return true
  return false
}
