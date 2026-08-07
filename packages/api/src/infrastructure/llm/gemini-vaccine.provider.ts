import type { VaccineCardUnderstanding } from '../../domain/document/vaccine-understanding.js'
import type { InterpretationTier } from '../../domain/document/handwriting-understanding.js'
import { VACCINE_CARD_UNDERSTANDING_PROMPT } from '../../domain/document/vaccine-understanding.prompt.js'
import { geminiFreeModel, geminiPremiumModel } from '../../domain/document/handwriting-policy.js'
import { parseVaccineCardUnderstandingJson } from './vaccine-json.parser.js'

async function callGeminiVaccineVision(
  buffer: Buffer,
  mimeType: string,
  model: string,
  ocrText?: string | null,
): Promise<VaccineCardUnderstanding> {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) throw new Error('GEMINI_API_KEY não configurada')

  const ocrHint = ocrText?.trim()
    ? `\n\nTexto OCR auxiliar (pode conter erros):\n${ocrText.slice(0, 4000)}`
    : ''

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: VACCINE_CARD_UNDERSTANDING_PROMPT + ocrHint },
          { inline_data: { mime_type: mimeType, data: buffer.toString('base64') } },
        ],
      }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gemini vision falhou (${res.status}): ${body.slice(0, 300)}`)
  }

  const json = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Gemini vision não retornou conteúdo')

  const parsed = parseVaccineCardUnderstandingJson(text)
  return { ...parsed, provider: `gemini:${model}` }
}

export class GeminiVaccineCardUnderstandingProvider {
  async interpretVaccineCard(
    buffer: Buffer,
    mimeType: string,
    opts?: { tier: InterpretationTier; ocrText?: string | null },
  ): Promise<VaccineCardUnderstanding> {
    const model = opts?.tier === 'premium' ? geminiPremiumModel() : geminiFreeModel()
    const result = await callGeminiVaccineVision(buffer, mimeType, model, opts?.ocrText)
    return { ...result, tier: opts?.tier ?? 'free' }
  }
}
