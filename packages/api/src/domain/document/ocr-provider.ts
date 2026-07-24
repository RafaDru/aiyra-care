export interface OcrResult {
  text: string
}

export interface OcrProvider {
  extractText(buffer: Buffer, mimeType: string): Promise<OcrResult>
}
