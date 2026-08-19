import { describe, expect, it } from 'vitest'
import { extractHermesPardiniExamSummary } from '../src/infrastructure/scraper/hermes-pardini-exam-summary.js'

describe('hermes-pardini-exam-summary', () => {
  it('extracts resultado and historico array', () => {
    const summary = extractHermesPardiniExamSummary({
      resultado: '12,5',
      valorReferencia: '11,0 - 15,0',
      historico: [
        { data: '2025-06-01', resultado: '11,2' },
        { data: '2024-12-01', resultado: '10,8' },
      ],
    })
    expect(summary).toContain('resultado: 12,5')
    expect(summary).toContain('histórico:')
    expect(summary).toContain('2025-06-01: 11,2')
  })

  it('returns null when no fields', () => {
    expect(extractHermesPardiniExamSummary({})).toBeNull()
  })
})
