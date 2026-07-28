import { describe, it, expect } from 'vitest'
import { buildDocumentOcrProviders } from '../src/infrastructure/ocr/document-ocr.factory.js'

describe('document-ocr.factory', () => {
  it('uses TrOCR first for prescriptions', () => {
    const names = buildDocumentOcrProviders('prescription').map((p) => p.name)
    expect(names[0]).toBe('trocr')
    expect(names).toContain('python')
    expect(names.at(-1)).toBe('google_vision')
  })

  it('skips TrOCR for identity documents', () => {
    const names = buildDocumentOcrProviders('certidao_nascimento').map((p) => p.name)
    expect(names[0]).toBe('python')
    expect(names).not.toContain('trocr')
  })
})
