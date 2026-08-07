import type {
  InterpretationTier,
  PrescriptionUnderstanding,
  PrescriptionUnderstandingPort,
} from '../../domain/document/handwriting-understanding.js'
import { geminiFreeModel, geminiPremiumModel, openAiVisionModel } from '../../domain/document/handwriting-policy.js'
import { PRESCRIPTION_UNDERSTANDING_PROMPT } from '../../domain/document/prescription-understanding.prompt.js'
import { parsePrescriptionUnderstandingJson, isSatisfactoryInterpretation } from './prescription-json.parser.js'
import { tryGeminiVision } from './gemini-prescription.provider.js'
import { tryGroqTextStructure } from './groq-text-prescription.provider.js'

async function tryOpenAiVision(
  buffer: Buffer,
  mimeType: string,
  tier: InterpretationTier,
): Promise<PrescriptionUnderstanding> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error('OPENAI_API_KEY não configurada')

  const model = openAiVisionModel()
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: PRESCRIPTION_UNDERSTANDING_PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${buffer.toString('base64')}` } },
        ],
      }],
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI vision falhou (${res.status}): ${body.slice(0, 300)}`)
  }

  const json = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = json.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenAI vision vazio')

  const parsed = parsePrescriptionUnderstandingJson(text)
  return { ...parsed, provider: `openai:${model}`, tier }
}

type Attempt = { provider: string; ok: boolean; error?: string }

/**
 * Cascata alinhada ao modelo de negócio:
 * - tier free (franquia mensal): Gemini Flash free → Groq texto no OCR existente
 * - tier premium (pacote): acima + Gemini Pro + OpenAI vision
 */
export class CascadePrescriptionUnderstandingProvider implements PrescriptionUnderstandingPort {
  async interpretHandwriting(
    buffer: Buffer,
    mimeType: string,
    opts?: { tier: InterpretationTier; ocrText?: string | null },
  ): Promise<PrescriptionUnderstanding> {
    const tier = opts?.tier ?? 'free'
    const attempts: Attempt[] = []

    const tryProvider = async (
      label: string,
      fn: () => Promise<PrescriptionUnderstanding>,
    ): Promise<PrescriptionUnderstanding | null> => {
      try {
        const result = await fn()
        if (!isSatisfactoryInterpretation(result)) {
          attempts.push({ provider: label, ok: false, error: 'resultado insatisfatório' })
          return null
        }
        attempts.push({ provider: label, ok: true })
        return result
      } catch (err) {
        attempts.push({
          provider: label,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        })
        return null
      }
    }

    if (process.env.GEMINI_API_KEY?.trim()) {
      const flash = await tryProvider('gemini-flash', () =>
        tryGeminiVision(buffer, mimeType, geminiFreeModel(), tier))
      if (flash) return flash
    }

    if (opts?.ocrText?.trim() && process.env.GROQ_API_KEY?.trim()) {
      const groq = await tryProvider('groq-text', () =>
        tryGroqTextStructure(opts.ocrText!, tier))
      if (groq) return groq
    }

    if (tier === 'premium') {
      if (process.env.GEMINI_API_KEY?.trim()) {
        const pro = await tryProvider('gemini-pro', () =>
          tryGeminiVision(buffer, mimeType, geminiPremiumModel(), tier))
        if (pro) return pro
      }

      if (process.env.OPENAI_API_KEY?.trim()) {
        const oai = await tryProvider('openai-vision', () =>
          tryOpenAiVision(buffer, mimeType, tier))
        if (oai) return oai
      }
    }

    const detail = attempts.map((a) => `${a.provider}: ${a.error || 'ok'}`).join('; ')
    if (tier === 'free') {
      throw new Error(
        `Free tier esgotado ou indisponível (${detail}). Adquira créditos de pacote para interpretação premium.`,
      )
    }
    throw new Error(`Nenhum provedor premium conseguiu interpretar (${detail})`)
  }
}
