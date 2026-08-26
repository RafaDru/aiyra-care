import { describe, expect, it, vi } from 'vitest'
import { AvaDocumentContextService } from '../src/application/llm/ava-document-context.service.js'
import { Document } from '../src/domain/document/document.entity.js'

describe('AvaDocumentContextService', () => {
  it('builds block with OCR text', async () => {
    const doc = Document.create({
      patientId: 'pat-1',
      documentType: 'exam',
      originalFilename: 'hemograma.jpg',
      storagePath: '/tmp/x',
      extractedText: 'Hemoglobina 12 g/dL',
    })
    const documents = {
      findById: vi.fn(async () => doc),
    }
    const pool = {
      query: vi.fn(async () => ({ rows: [{ interpretation_json: null }] })),
    }
    const svc = new AvaDocumentContextService(documents, pool as never)
    const block = await svc.buildAttachmentBlock('pat-1', doc.id)
    expect(block).toContain('hemograma.jpg')
    expect(block).toContain('Hemoglobina')
  })

  it('rejects wrong patient', async () => {
    const doc = Document.create({
      patientId: 'pat-other',
      documentType: 'exam',
      originalFilename: 'x.jpg',
      storagePath: '/tmp/x',
    })
    const documents = { findById: vi.fn(async () => doc) }
    const pool = { query: vi.fn() }
    const svc = new AvaDocumentContextService(documents as never, pool as never)
    await expect(svc.buildAttachmentBlock('pat-1', doc.id)).rejects.toThrow('AVA_ATTACHMENT_PATIENT_MISMATCH')
  })
})
