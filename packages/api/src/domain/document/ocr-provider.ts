export interface OcrResult {
  text: string
}

export type OcrAttempt = {
  provider: string
  qualityScore: number
  ok: boolean
  error?: string
}

/** Result of cascade OCR (local first, paid fallback). */
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
