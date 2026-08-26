import { describe, expect, it } from 'vitest'
import {
  isSensitiveBodyRoute,
  sanitizeLogObject,
  sanitizeLogValue,
} from '../src/infrastructure/http/log-sanitization.js'

describe('log sanitization', () => {
  it('detects ava chat and document routes', () => {
    expect(isSensitiveBodyRoute('/patients/abc/ava/chat')).toBe(true)
    expect(isSensitiveBodyRoute('/documents/xyz')).toBe(true)
    expect(isSensitiveBodyRoute('/health')).toBe(false)
  })

  it('redacts PHI-like keys', () => {
    const out = sanitizeLogObject({
      patientId: 'p1',
      message: 'febre alta desde ontem',
      nested: { extractedText: 'hemograma completo...' },
      duration_ms: 1200,
    })
    expect(out.message).toBe('[REDACTED]')
    expect(out.nested).toEqual({ extractedText: '[REDACTED]' })
    expect(out.duration_ms).toBe(1200)
    expect(out.patientId).toBe('p1')
  })

  it('truncates long strings', () => {
    const long = 'x'.repeat(200)
    const out = sanitizeLogValue(long) as string
    expect(out).toContain('len=200')
    expect(out.length).toBeLessThan(100)
  })
})
