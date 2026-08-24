/**
 * Prompt e parser para fallback LLM na extração de marcadores de laudos
 * (quando o parser determinístico da fonte não reconhece o formato).
 * Custo: bucket INTERNO (nosso), com metering e teto mensal.
 */

import type { LlmMessage, LlmTokenUsage } from './llm.types.js'
import { estimatePromptTokens } from './llm-policy.js'
import type { ExtractedExamMarkerItem } from '../../domain/exam-artifact/exam-artifact.types.js'

export interface LlmParsedMarker {
  markerName: string
  technicalName?: string
  numericValue?: number
  displayValue: string
  unit?: string
  referenceRange?: string
  status: 'normal' | 'altered' | 'critical'
}

const SYSTEM_PROMPT = `Você extrai marcadores laboratoriais estruturados de laudos médicos brasileiros (texto de PDF/OCR).
Responda SEMPRE um JSON array, um objeto por analito/marcador encontrado:
[{"markerName":"<nome popular>","technicalName":"<nome técnico/sigla se houver>","numericValue":<número ou null>,"displayValue":"<valor como escrito>","unit":"<unidade>","referenceRange":"<faixa de referência>","status":"normal|altered|critical"}]

Regras:
- Extraia apenas valores que ESTÃO no texto. Não invente.
- markerName: nome popular em português (ex.: "Hemoglobina", "TSH", "Proteína C Reativa").
- numericValue: valor numérico parseado (troque vírgula decimal por ponto; "10.700" = 10700). Se não for numérico (ex.: "NEGATIVO", "Não Detectado", "NORMAL"), use null e mantenha displayValue.
- status: "altered" se fora da faixa de referência, "critical" se criticamente alterado, senão "normal".
- Ignore cabeçalhos, assinaturas, bibliografia e notas metodológicas.
- Limite: no máximo 40 marcadores. Se o texto não contiver resultados de exames, responda [].`

export function buildMarkerExtractionMessages(reportText: string): LlmMessage[] {
  // Trunca para caber no contexto econômico dos modelos free/flash (~12k chars ≈ 3k tokens).
  const clipped = reportText.replace(/\0/g, '').slice(0, 12000)
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Extraia os marcadores deste laudo:\n\n${clipped}\n\nResponda apenas o JSON array.`,
    },
  ]
}

export function parseMarkersJson(text: string): LlmParsedMarker[] {
  const trimmed = (text ?? '').trim()
  if (!trimmed) return []
  const match = trimmed.match(/\[[\s\S]*\]/)
  const jsonText = match ? match[0] : trimmed
  let data: unknown
  try {
    data = JSON.parse(jsonText)
  } catch {
    try {
      data = JSON.parse(jsonText.replace(/```json|```/g, '').trim())
    } catch {
      return []
    }
  }
  if (!Array.isArray(data)) return []
  const out: LlmParsedMarker[] = []
  for (const item of data.slice(0, 40)) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const name = typeof rec.markerName === 'string' ? rec.markerName.trim() : ''
    const display = typeof rec.displayValue === 'string' ? rec.displayValue.trim() : ''
    if (!name || !display) continue
    const numRaw = rec.numericValue
    const numeric =
      typeof numRaw === 'number' && Number.isFinite(numRaw)
        ? numRaw
        : typeof numRaw === 'string' && numRaw.trim() !== '' && Number.isFinite(Number(numRaw.replace(',', '.')))
          ? Number(numRaw.replace(',', '.'))
          : undefined
    out.push({
      markerName: name,
      technicalName: typeof rec.technicalName === 'string' && rec.technicalName.trim() ? rec.technicalName.trim() : undefined,
      numericValue: numeric,
      displayValue: display,
      unit: typeof rec.unit === 'string' && rec.unit.trim() ? rec.unit.trim() : undefined,
      referenceRange:
        typeof rec.referenceRange === 'string' && rec.referenceRange.trim() ? rec.referenceRange.trim() : undefined,
      status: asStatus(rec.status),
    })
  }
  return out
}

function asStatus(v: unknown): LlmParsedMarker['status'] {
  const s = String(v ?? '').toLowerCase().trim()
  if (s === 'altered' || s === 'critical') return s
  return 'normal'
}

/** Converte resultado do LLM para itens canônicos com collectedAt do laudo. */
export function toExtractedItems(parsed: LlmParsedMarker[], collectedAt: Date): ExtractedExamMarkerItem[] {
  return parsed.map((p) => ({ ...p, collectedAt }))
}

/** Estimativa de tokens (entrada real + reserva de saída p/ até ~40 marcadores). */
export function estimateMarkerExtractionTokens(messages: LlmMessage[]): LlmTokenUsage {
  const tokensIn = estimatePromptTokens(messages)
  const tokensOut = Math.min(2048, Math.max(256, tokensIn))
  return { tokensIn, tokensOut, tokensTotal: tokensIn + tokensOut, usageSource: 'estimated' }
}
