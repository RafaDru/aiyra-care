import { describe, it, expect } from 'vitest'
import {
  mapMaterDeiExamSearchRow,
  mapMaterDeiExamSearchResponse,
  materDeiExamDedupKey,
} from '../src/infrastructure/scraper/materdei-exam.mapper.js'

describe('materdei-exam.mapper', () => {
  it('maps order with items into one row per item', () => {
    const rows = mapMaterDeiExamSearchRow({
      hospitalId: 12,
      doctorName: 'Dr. Silva',
      requestedDate: '2026-03-15T10:00:00',
      provider: 'Mater Dei Contorno',
      status: 'DISPONIVEL',
      order: {
        id: 99001,
        type: 'IMAGEM',
        items: [
          { item_id: 1, name: 'Tomografia computadorizada de crânio', accession_number: 'ACC123' },
          { item_id: 2, name: 'Hemograma completo' },
        ],
      },
    })

    expect(rows).toHaveLength(2)
    expect(rows[0].examType).toContain('Tomografia')
    expect(rows[0].accessionNumber).toBe('ACC123')
    expect(rows[0].examOrderId).toBe(99001)
    expect(rows[0].examOrderItemId).toBe(1)
    expect(rows[1].examOrderItemId).toBe(2)
  })

  it('maps order without items using fallback name', () => {
    const rows = mapMaterDeiExamSearchRow({
      requestedDate: '2026-01-01',
      order: { id: 42, description: 'Raio-X tórax' },
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].examType).toBe('Raio-X tórax')
  })

  it('flattens search response array', () => {
    const exams = mapMaterDeiExamSearchResponse([
      { requestedDate: '2026-01-01', order: { id: 1, items: [{ item_id: 9, name: 'TC' }] } },
    ])
    expect(exams).toHaveLength(1)
    expect(exams[0].examType).toBe('TC')
  })

  it('builds stable dedup key', () => {
    const key = materDeiExamDedupKey({
      examOrderId: 1,
      examOrderItemId: 2,
      examType: 'TC',
      examDate: '2026-03-15T10:00:00',
    })
    expect(key).toBe('mater_dei:1:2:2026-03-15')
  })
})
