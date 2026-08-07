import type {
  InterpretationTier,
  PrescriptionUnderstanding,
  PrescriptionUnderstandingPort,
} from '../../domain/document/handwriting-understanding.js'
import { PRESCRIPTION_UNDERSTANDING_PROMPT } from '../../domain/document/prescription-understanding.prompt.js'
import { geminiFreeModel, geminiPremiumModel, geminiFreeModelCandidates, geminiPremiumModelCandidates } from '../../domain/document/handwriting-policy.js'
import { parsePrescriptionUnderstandingJson } from './prescription-json.parser.js'

async function callGeminiVision(
  buffer: Buffer,
  mimeType: string,
  model: string,
): Promise<PrescriptionUnderstanding> {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) throw new Error('GEMINI_API_KEY não configurada')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: PRESCRIPTION_UNDERSTANDING_PROMPT },
          { inline_data: { mime_type: mimeType, data: buffer.toString('base64') } },
        ],
      }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = new Error(`Gemini vision falhou (${res.status}): ${body.slice(0, 300)}`)
    if (res.status === 429) (err as Error & { rateLimited?: boolean }).rateLimited = true
    throw err
  }

  const json = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Gemini vision não retornou conteúdo')

  const parsed = parsePrescriptionUnderstandingJson(text)
  return { ...parsed, provider: `gemini:${model}` }
}

export class GeminiPrescriptionUnderstandingProvider implements PrescriptionUnderstandingPort {
  async interpretHandwriting(
    buffer: Buffer,
    mimeType: string,
    opts?: { tier: InterpretationTier; ocrText?: string | null },
  ): Promise<PrescriptionUnderstanding> {
    const model = opts?.tier === 'premium' ? geminiPremiumModel() : geminiFreeModel()
    const result = await callGeminiVision(buffer, mimeType, model)
    return { ...result, tier: opts?.tier ?? 'free' }
  }
}

/** Expõe Gemini Flash/Pro para a cascata (com fallback se modelo descontinuado). */
export async function tryGeminiVision(
  buffer: Buffer,
  mimeType: string,
  model: string,
  tier: InterpretationTier,
): Promise<PrescriptionUnderstanding> {
  const candidates = tier === 'premium'
    ? [...new Set([model, ...geminiPremiumModelCandidates()])]
    : [...new Set([model, ...geminiFreeModelCandidates()])]

  let lastErr: Error | null = null
  for (const candidate of candidates) {
    try {
      const result = await callGeminiVision(buffer, mimeType, candidate)
      return { ...result, tier }
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err))
      const deprecated = lastErr.message.includes('(404)') || lastErr.message.includes('no longer available')
      if (!deprecated) throw lastErr
    }
  }
  throw lastErr ?? new Error('Gemini vision falhou')
}
