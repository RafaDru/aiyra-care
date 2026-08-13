import { describe, expect, it } from 'vitest'
import { buildGoLiveStatus, getLegalPublisher } from '../src/application/legal-compliance/legal-publisher.js'

describe('getLegalPublisher', () => {
  it('returns incomplete when env missing', () => {
    const p = getLegalPublisher()
    expect(p.complete).toBe(false)
  })
})

describe('buildGoLiveStatus', () => {
  it('marks required documents ok when both kinds published', () => {
    const s = buildGoLiveStatus({ documentsPublished: 4, requiredKindsPublished: 2 })
    expect(s.requiredDocumentsOk).toBe(true)
    expect(s.checklist.some((c) => c.id === 'required_documents' && c.ok)).toBe(true)
    expect(s.dpoSlaDays).toBeGreaterThan(0)
  })
})
