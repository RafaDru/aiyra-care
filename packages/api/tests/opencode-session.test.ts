import { describe, expect, it } from 'vitest'
import {
  buildAvaOpenCodeSessionId,
  normalizeOpenCodeSessionId,
  resolveOpenCodeSessionId,
  stableOpenCodeSessionFromParts,
} from '../src/domain/llm/opencode-session.js'

describe('opencode-session', () => {
  it('usa conversationId da Ava quando presente', () => {
    expect(buildAvaOpenCodeSessionId({
      conversationId: 'conv-abc',
      scopeId: 'scope',
      patientId: 'pat',
    })).toBe('conv-abc')
  })

  it('fallback Ava usa thread ou scope+patient', () => {
    expect(buildAvaOpenCodeSessionId({
      scopeId: 'scope',
      patientId: 'pat',
      healthThreadId: 'thread-1',
    })).toBe('ava-thread:thread-1')
    expect(buildAvaOpenCodeSessionId({ scopeId: 'scope', patientId: 'pat' })).toBe('ava:scope:pat')
  })

  it('resolveOpenCodeSessionId prefere explicit', () => {
    expect(resolveOpenCodeSessionId('my-session', ['fallback'])).toBe('my-session')
  })

  it('stableOpenCodeSessionFromParts é determinístico', () => {
    const a = stableOpenCodeSessionFromParts(['x', 'y'])
    const b = stableOpenCodeSessionFromParts(['x', 'y'])
    expect(a).toBe(b)
    expect(a.length).toBe(32)
  })

  it('normalize trunca ids longos', () => {
    const long = 'a'.repeat(200)
    expect(normalizeOpenCodeSessionId(long).length).toBeLessThanOrEqual(128)
  })
})
