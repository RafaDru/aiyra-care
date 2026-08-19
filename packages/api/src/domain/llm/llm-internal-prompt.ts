import type { LlmMessage, LlmTokenUsage } from './llm.types.js'
import { estimatePromptTokens } from './llm-policy.js'

export interface LlmParsedClassification {
  label: string
  normalizedLabel?: string
  kind: 'consulta' | 'exame' | 'vacina' | 'procedimento' | 'outro'
  destination: 'medical_record' | 'exam' | 'vaccine'
  canonicalName?: string
}

const SYSTEM_PROMPT = `Você classifica rótulos de procedimentos de saúde de operadora brasileira para um prontuário.
Para cada rótulo, responda um JSON array, um objeto por rótulo, usando SEMPRE esta forma:
[{"label":"<rótulo original>","kind":"consulta|exame|vacina|procedimento|outro","destination":"medical_record|exam|vaccine","canonicalName":"<nome canônico, se óbvio>"}]

Regras de destino:
- consulta (consulta médica, pronto socorro, atendimento clínico, retorno) -> medical_record
- exame (laboratorial, imagem, hemograma, glicemia, raio-x etc.) -> exam
- vacina -> vaccine
- procedimento (cirurgia, sessão, fisioterapia etc.) -> medical_record
- outro -> medical_record

Use seu conhecimento de siglas, acrônimos, acentuação e sinônimos (ex.: HBA1C = hemoglobina glicada; glicemia/glicose = exame).
Não invente informações. Se absolutamente não souber, use kind=outro, destination=medical_record.`

export function buildClassificationMessages(rawLabels: string[]): LlmMessage[] {
  const labels = Array.from(new Set(rawLabels.map((l) => l.trim()).filter(Boolean)))
  const userJson = labels.map((l) => `"${l.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(', ')
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Classifique estes rótulos de procedimento:\n[${userJson}]\nResponda apenas o JSON array.`,
    },
  ]
}

export function parseClassificationJson(text: string): LlmParsedClassification[] {
  const trimmed = (text ?? '').trim()
  if (!trimmed) return []
  const match = trimmed.match(/\[[\s\S]*\]/)
  const jsonText = match ? match[0] : trimmed
  let data: unknown
  try {
    data = JSON.parse(jsonText)
  } catch {
    // Tenta recuperar um array mesmo com ruído (ex.: markdown code fence).
    const cleaned = jsonText.replace(/```json|```/g, '').trim()
    try {
      data = JSON.parse(cleaned)
    } catch {
      return []
    }
  }
  if (!Array.isArray(data)) return []
  const out: LlmParsedClassification[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const label = typeof rec.label === 'string' ? rec.label : undefined
    if (!label) continue
    const kind = asKind(rec.kind)
    const destination = asDestination(rec.destination, kind)
    out.push({
      label,
      normalizedLabel: typeof rec.normalizedLabel === 'string' ? rec.normalizedLabel : undefined,
      kind,
      destination,
      canonicalName: typeof rec.canonicalName === 'string' ? rec.canonicalName : undefined,
    })
  }
  return out
}

function asKind(v: unknown): LlmParsedClassification['kind'] {
  const s = String(v ?? '').toLowerCase().trim()
  return s === 'consulta' || s === 'exame' || s === 'vacina' || s === 'procedimento' || s === 'outro'
    ? s
    : 'outro'
}

function asDestination(v: unknown, kind: LlmParsedClassification['kind']): LlmParsedClassification['destination'] {
  const s = String(v ?? '').toLowerCase().trim()
  if (s === 'exam' || s === 'vaccine' || s === 'medical_record') {
    return s
  }
  // Fallback consistente com as regras.
  if (kind === 'exame') return 'exam'
  if (kind === 'vacina') return 'vaccine'
  return 'medical_record'
}

/** Estimativa de tokens da chamada (prompt real + reserva de saída modesta). */
export function estimateTokenUsage(messages: LlmMessage[]): LlmTokenUsage {
  const tokensIn = estimatePromptTokens(messages)
  // Reserva de saída conservadora: ~1 rótulo ≈ até ~48 tokens de JSON.
  const jsonOutReserve = 64
  const tokensOut = Math.max(jsonOutReserve, Math.min(256, Math.ceil(tokensIn / 4)))
  return {
    tokensIn,
    tokensOut,
    tokensTotal: tokensIn + tokensOut,
    usageSource: 'estimated',
  }
}
