/** Agrupa linhas clínicas repetidas no contexto Ava (tokens + clareza para o LLM). */

export interface VaccineRowLike {
  vaccineName: string
  applicationDate: Date
  doseNumber?: number | null
  clinic?: string | null
}

export interface ExamRowLike {
  examType: string
  examDate: Date
  laboratory?: string | null
  resultSummary?: string | null
  notes?: string | null
}

function normKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function groupVaccineRows<T extends VaccineRowLike>(rows: T[]): Array<{ key: string; items: T[] }> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const dose = row.doseNumber != null ? String(row.doseNumber) : ''
    const key = `${dateKey(row.applicationDate)}|${normKey(row.vaccineName)}|${dose}`
    const list = map.get(key) ?? []
    list.push(row)
    map.set(key, list)
  }
  return [...map.entries()]
    .map(([key, items]) => ({ key, items }))
    .sort((a, b) => b.items[0].applicationDate.getTime() - a.items[0].applicationDate.getTime())
}

export function groupExamRows<T extends ExamRowLike>(rows: T[]): Array<{ key: string; items: T[] }> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const lab = row.laboratory ? normKey(row.laboratory) : ''
    const key = `${dateKey(row.examDate)}|${normKey(row.examType)}|${lab}`
    const list = map.get(key) ?? []
    list.push(row)
    map.set(key, list)
  }
  return [...map.entries()]
    .map(([key, items]) => ({ key, items }))
    .sort((a, b) => b.items[0].examDate.getTime() - a.items[0].examDate.getTime())
}

export function formatHygieneCandidateDescription(
  entityType: string,
  evidence: Record<string, unknown>,
  detector?: string,
): string {
  const parts: string[] = []
  if (evidence.vaccineName) parts.push(String(evidence.vaccineName))
  if (evidence.examType) parts.push(String(evidence.examType))
  if (evidence.applicationDate) parts.push(String(evidence.applicationDate))
  if (evidence.catalogSlotKey) parts.push(`slot ${String(evidence.catalogSlotKey)}`)
  if (detector) parts.push(`detector: ${detector}`)
  if (parts.length) return `${entityType}: ${parts.join(' · ')}`
  return `Marcar duplicata (${entityType})`
}

export const VACCINE_INTENT_RE = /\b(vacina|vacinas|imuniza|dengue|pneumo|covid|dng)\b/i
export const EXAM_INTENT_RE = /\b(exame|exames|hemograma|laborat|resultado|laudo|marcador|glicose|colesterol)\b/i
export const HYGIENE_USER_RE = /\b(duplicat|duplicad|higieniz|mesmo exame|mesmas? vacinas?|unificar|merge|refer[eê]ncia|averiguad|manter s[oó] uma|excluir|remover)\b/i
export const HYGIENE_ASSISTANT_DUPLICATE_RE = /\b(\d+ registros no prontu[aá]rio|poss[ií]vel duplicidade|m[uú]ltiplos registros|duplicidad)\b/i
export const HYGIENE_CONFIRM_RE = /\b(sim|pode|ok|confirmo|manter|excluir|unificar|averiguad|refer[eê]ncia|s[oó] uma)\b/i

export function shouldOfferHygieneActions(userMessage: string, recentAssistantText?: string): boolean {
  const trimmed = userMessage.trim()
  if (!trimmed) return false
  if (HYGIENE_USER_RE.test(trimmed)) return true
  if (!recentAssistantText) return false
  return HYGIENE_ASSISTANT_DUPLICATE_RE.test(recentAssistantText) && HYGIENE_CONFIRM_RE.test(trimmed)
}
