import type { OcrProvider, CascadeOcrResult, OcrLayout } from '../../domain/document/ocr-provider.js'
import { scoreOcrText, type OcrProviderName } from '../../domain/document/ocr-quality.js'
import { normalizeOcrLayout, textFromOcrRegions } from '../../domain/document/text-encoding.js'

export type NamedOcrProvider = OcrProvider & { readonly name: OcrProviderName }

function finalizeResult(result: CascadeOcrResult): CascadeOcrResult {
  if (!result.layout?.regions?.length) return result
  const regions = normalizeOcrLayout(result.layout.regions)
  const layout: OcrLayout = {
    imageWidth: result.layout.imageWidth,
    imageHeight: result.layout.imageHeight,
    regions,
  }
  return {
    ...result,
    layout,
    text: textFromOcrRegions(regions) || result.text,
  }
}

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
          layout: result.layout,
          provider: provider.name,
          qualityScore,
          usedPaid: paid,
          attempts: [...attempts],
        }

        if (!best || qualityScore > best.qualityScore) {
          best = {
            ...candidate,
            layout: candidate.layout ?? best?.layout,
          }
        } else if (result.layout && !best.layout) {
          best = { ...best, layout: result.layout }
        }

        if (this.isSufficient(result.text)) {
          return finalizeResult({ ...candidate, attempts })
        }

        if (result.layout?.regions?.length >= 2 && qualityScore >= 25) {
          return finalizeResult({ ...candidate, attempts })
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

    return finalizeResult({ ...best, attempts })
  }
}
