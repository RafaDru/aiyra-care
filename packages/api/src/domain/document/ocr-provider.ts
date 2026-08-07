export interface OcrRegion {
  id: string
  text: string
  left: number
  top: number
  width: number
  height: number
  confidence?: number
  lineIndex?: number
}

export interface OcrLayout {
  imageWidth: number
  imageHeight: number
  regions: OcrRegion[]
}

export interface OcrResult {
  text: string
  layout?: OcrLayout
}

export type OcrAttempt = {
  provider: string
  qualityScore: number
  ok: boolean
  error?: string
}

/** CascadeOcrResult extends OcrResult */
export interface CascadeOcrResult extends OcrResult {
  provider: string
  qualityScore: number
  usedPaid: boolean
  attempts: OcrAttempt[]
}

export interface OcrProvider {
  extractText(buffer: Buffer, mimeType: string): Promise<OcrResult>
}

export type DocumentOcrRunner = {
  extractText(buffer: Buffer, mimeType: string): Promise<CascadeOcrResult>
}
