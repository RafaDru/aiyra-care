/**
 * Local OCR quality heuristics — decide paid fallback + accumulate metrics.
 */

export type OcrProviderName = 'python' | 'trocr' | 'google_vision' | 'unknown'

export function scoreOcrText(text: string): number {
  const t = text.trim()
  if (!t) return 0
  let score = Math.min(t.length, 4000) / 100
  if (/CERTID[AÃ]O\s+DE\s+NASCIMENTO/i.test(t)) score += 50
  if (/\bCPF\b/i.test(t)) score += 20
  if (/\bNOME\b/i.test(t)) score += 10
  if (/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/.test(t)) score += 25
  const letters = (t.match(/[A-Za-zÁ-ú0-9]/g) || []).length
  const ratio = letters / Math.max(t.length, 1)
  if (ratio < 0.45) score -= 40
  if (ratio > 0.7) score += 15
  return Math.round(score * 10) / 10
}

/** Minimum text-quality score before we accept local OCR without paid fallback. */
export const LOCAL_OCR_MIN_SCORE = 40
