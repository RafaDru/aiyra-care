import { repairUtf8Mojibake } from './text-encoding-repair.js'
import type { OcrLayout } from './api.types.js'

export function normalizeDisplayText(text: string): string {
  return repairUtf8Mojibake(text)
    .replace(/\uFFFD/g, '')
    .replace(/\r\n/g, '\n')
}

export function textFromOcrLayout(layout: OcrLayout): string {
  return [...layout.regions]
    .sort((a, b) => (a.lineIndex ?? 0) - (b.lineIndex ?? 0))
    .map((r) => normalizeDisplayText(r.text))
    .filter(Boolean)
    .join('\n')
}

export function isImageMime(mime: string | null | undefined): boolean {
  return !!mime && mime.startsWith('image/')
}

export function canUseOcrRegionReview(
  mimeType: string | null | undefined,
  layout: OcrLayout | null | undefined,
): boolean {
  return isImageMime(mimeType) && !!layout?.regions?.length
}

export function normalizeOcrLayoutForDisplay(layout: OcrLayout): OcrLayout {
  return {
    ...layout,
    regions: layout.regions.map((r) => ({
      ...r,
      text: normalizeDisplayText(r.text),
    })),
  }
}
