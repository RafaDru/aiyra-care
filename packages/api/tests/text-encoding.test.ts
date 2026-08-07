import { describe, it, expect } from 'vitest'
import { normalizeOcrText, repairUtf8Mojibake } from '../src/domain/document/text-encoding.js'

describe('text-encoding', () => {
  it('repairs latin1-misread UTF-8', () => {
    const broken = Buffer.from('ação vacinação', 'utf8').toString('latin1')
    const fixed = repairUtf8Mojibake(broken)
    expect(fixed).toContain('ação')
    expect(fixed).toContain('vacinação')
  })

  it('normalizeOcrText keeps valid portuguese', () => {
    expect(normalizeOcrText('Cartão Nacional de Vacinação')).toBe('Cartão Nacional de Vacinação')
  })
})
