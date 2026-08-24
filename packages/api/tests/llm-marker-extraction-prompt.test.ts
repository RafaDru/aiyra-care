import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  buildMarkerExtractionMessages,
  parseMarkersJson,
  toExtractedItems,
} from '../src/domain/llm/llm-marker-extraction-prompt.js'

describe('llm-marker-extraction-prompt', () => {
  it('monta mensagens com system + user e trunca texto longo', () => {
    const longText = 'X'.repeat(20000)
    const msgs = buildMarkerExtractionMessages(longText)
    expect(msgs).toHaveLength(2)
    expect(msgs[0].role).toBe('system')
    expect(msgs[1].content.length).toBeLessThan(13000)
  })

  it('parseia JSON array de marcadores válido', () => {
    const json = JSON.stringify([
      { markerName: 'Hemoglobina', numericValue: 11.6, displayValue: '11,6', unit: 'g/dL', referenceRange: '11,5 a 16,5 g/dL', status: 'normal' },
      { markerName: 'Biotinidase', displayValue: 'NORMAL', status: 'normal' },
      { markerName: 'Hematócrito', numericValue: 32.3, displayValue: '32,3', unit: '%', status: 'altered' },
    ])
    const parsed = parseMarkersJson(json)
    expect(parsed).toHaveLength(3)
    expect(parsed[0].numericValue).toBe(11.6)
    expect(parsed[1].numericValue).toBeUndefined()
    expect(parsed[2].status).toBe('altered')
  })

  it('tolera markdown fence e ruído', () => {
    const noisy = 'Aqui está:\n```json\n[{"markerName":"TSH","displayValue":"2.08","numericValue":"2,08","status":"normal"}]\n```'
    const parsed = parseMarkersJson(noisy)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].numericValue).toBeCloseTo(2.08, 2)
  })

  it('descarta itens sem nome ou valor', () => {
    const parsed = parseMarkersJson('[{"markerName":"","displayValue":"x"},{"markerName":"Y","displayValue":""},null]')
    expect(parsed).toHaveLength(0)
  })

  it('toExtractedItems aplica collectedAt', () => {
    const at = new Date('2022-10-31T12:00:00Z')
    const items = toExtractedItems([{ markerName: 'Galactose', displayValue: '2,1', numericValue: 2.1, status: 'normal' }], at)
    expect(items[0].collectedAt).toBe(at)
  })
})
