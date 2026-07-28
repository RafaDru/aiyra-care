import type { OcrProvider, CascadeOcrResult } from '../../domain/document/ocr-provider.js'
import { scoreOcrText, type OcrProviderName } from '../../domain/document/ocr-quality.js'

export type NamedOcrProvider = OcrProvider & { readonly name: OcrProviderName }

/**
 * Tries providers in order (local first). Stops early when `isSufficient` returns true
 * so paid OCR is only used when local algorithms fail.
 */
export class CascadeOcrProvider {
  constructor(
    private readonly providers: NamedOcrProvider[],
    private readonly isSufficient: (text: string) => boolean,
  ) {}

  async extractText(buffer: Buffer, mimeType: string): Promise<CascadeOcrResult> {
    const attempts: CascadeOcrResult['attempts'] = []
    let best: CascadeOcrResult | null = null

    for (const provider of this.providers) {
      const paid = provider.name === 'google_vision'
      try {
        const result = await provider.extractText(buffer, mimeType)
        const qualityScore = scoreOcrText(result.text)
        attempts.push({ provider: provider.name, qualityScore, ok: !!result.text.trim() })

        if (!result.text.trim()) continue

        const candidate: CascadeOcrResult = {
          text: result.text,
          provider: provider.name,
          qualityScore,
          usedPaid: paid,
          attempts: [...attempts],
        }

        if (!best || qualityScore > best.qualityScore) best = candidate

        if (this.isSufficient(result.text)) {
          return { ...candidate, attempts }
        }
      } catch (err) {
        attempts.push({
          provider: provider.name,
          qualityScore: 0,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    if (!best) {
      const detail = attempts.map((a) => `${a.provider}: ${a.error || 'vazio'}`).join('; ')
      throw new Error(`Nenhum provedor OCR conseguiu extrair texto (${detail})`)
    }

    return { ...best, attempts }
  }
}
