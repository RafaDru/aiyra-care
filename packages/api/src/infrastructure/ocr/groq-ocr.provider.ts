/**
 * Groq OCR (vision). Many free-tier accounts no longer expose vision models
 * (Llama 4 Scout was decommissioned Jul 2026). Fail fast so composite OCR
 * can fall back to Google Vision / Python.
 */
import Groq from 'groq-sdk'
import type { OcrProvider, OcrResult } from '../../domain/document/ocr-provider.js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']

/** Prefer current Groq vision IDs; will fail if account has none. */
export const GROQ_VISION_MODEL =
  process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'

export class GroqOcrProvider implements OcrProvider {
  async extractText(buffer: Buffer, mimeType: string): Promise<OcrResult> {
    if (!supportedMimeTypes.includes(mimeType)) {
      throw new Error(`Formato não suportado para OCR via LLM: ${mimeType}`)
    }
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY não configurada')
    }

    const base64 = buffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64}`

    try {
      const completion = await groq.chat.completions.create({
        model: GROQ_VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia TODO o texto visível deste documento brasileiro (certidão de nascimento, RG, CPF, CNH ou documento de saúde). Preserve nomes, CPF, datas (DD/MM/AAAA), filiação e números. Responda APENAS com o texto extraído, sem comentários.',
              },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      })

      const text = completion.choices[0]?.message?.content?.trim()
      if (!text) throw new Error('Groq OCR não retornou texto')
      return { text }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/model_not_found|decommissioned|does not exist/i.test(msg)) {
        throw new Error(`Groq vision indisponível (${GROQ_VISION_MODEL}): ${msg}`)
      }
      throw err
    }
  }
}
