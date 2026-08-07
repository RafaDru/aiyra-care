/**
 * Repara texto UTF-8 lido como Latin-1/Windows-1252 (comum no Windows + child_process).
 */
export function repairUtf8Mojibake(text: string): string {
  if (!text) return text
  const suspicious = /Ã.|Â.|â€|ï¿½|\uFFFD/.test(text)
  if (!suspicious) return text

  try {
    const fixed = Buffer.from(text, 'latin1').toString('utf8')
    const badBefore = (text.match(/Ã./g) || []).length + (text.match(/\uFFFD/g) || []).length
    const badAfter = (fixed.match(/Ã./g) || []).length + (fixed.match(/\uFFFD/g) || []).length
    if (badAfter < badBefore) return fixed
    if (/[ãõçéíóúàêôÃÁÉÍÓÚ]/i.test(fixed) && badAfter <= badBefore) return fixed
  } catch {
    // ignore
  }
  return text
}

export function normalizeOcrText(text: string): string {
  return repairUtf8Mojibake(text)
    .replace(/\uFFFD/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
}

export function normalizeOcrLayout<T extends { text: string }>(regions: T[]): T[] {
  return regions.map((r) => ({ ...r, text: normalizeOcrText(r.text) }))
}

export function textFromOcrRegions(
  regions: Array<{ text: string; lineIndex?: number }>,
): string {
  return [...regions]
    .sort((a, b) => (a.lineIndex ?? 0) - (b.lineIndex ?? 0))
    .map((r) => r.text)
    .filter(Boolean)
    .join('\n')
}
