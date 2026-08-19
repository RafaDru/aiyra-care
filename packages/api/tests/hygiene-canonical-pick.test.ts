import { describe, it, expect } from 'vitest'
import { pickCanonicalEntityPair } from '../src/domain/hygiene/hygiene-canonical-pick.js'

describe('hygiene-canonical-pick', () => {
  it('prefers conectesus over manual', () => {
    const [canon, dup] = pickCanonicalEntityPair('exam', 'manual-id', 'gov-id', 'manual', 'conectesus')
    expect(canon).toBe('gov-id')
    expect(dup).toBe('manual-id')
  })

  it('prefers conectesus when A is gov', () => {
    const [canon, dup] = pickCanonicalEntityPair('exam', 'gov-id', 'manual-id', 'conectesus', 'manual')
    expect(canon).toBe('gov-id')
    expect(dup).toBe('manual-id')
  })
})
