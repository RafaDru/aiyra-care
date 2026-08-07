import Groq from 'groq-sdk'
import type {
  InterpretationTier,
  PrescriptionUnderstanding,
} from '../../domain/document/handwriting-understanding.js'
import { PRESCRIPTION_TEXT_ONLY_PROMPT } from '../../domain/document/prescription-understanding.prompt.js'
import { parsePrescriptionUnderstandingJson, isSatisfactoryInterpretation } from './prescription-json.parser.js'

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL?.trim() || 'llama-3.3-70b-versatile'

/** Estrutura texto OCR via Groq (free tier de texto — sem visão). */
export async function tryGroqTextStructure(
  ocrText: string,
  tier: InterpretationTier,
): Promise<PrescriptionUnderstanding> {
  if (!groq) throw new Error('GROQ_API_KEY não configurada')
  const trimmed = ocrText.trim()
  if (trimmed.length < 20) throw new Error('Texto OCR insuficiente para Groq')

  const completion = await groq.chat.completions.create({
    model: TEXT_MODEL,
    temperature: 0.1,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: `${PRESCRIPTION_TEXT_ONLY_PROMPT}\nResponda APENAS JSON válido.` },
      { role: 'user', content: trimmed },
    ],
  })

  const text = completion.choices[0]?.message?.content?.trim()
  if (!text) throw new Error('Groq não retornou JSON')

  const parsed = parsePrescriptionUnderstandingJson(text)
  const result: PrescriptionUnderstanding = {
    ...parsed,
    provider: `groq-text:${TEXT_MODEL}`,
    tier,
  }
  if (!isSatisfactoryInterpretation(result)) {
    throw new Error('Groq text: resultado insatisfatório')
  }
  return result
}
