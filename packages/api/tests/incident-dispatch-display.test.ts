import { describe, expect, it } from 'vitest'
import { sanitizeDispatchLastError } from '../src/domain/ops/incident-dispatch-display.js'

describe('sanitizeDispatchLastError', () => {
  it('redacts URLs and bearer tokens', () => {
    const raw =
      'HTTP 401 https://api.cursor.com/hook?key=supersecret Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig'
    const out = sanitizeDispatchLastError(raw)
    expect(out).not.toContain('https://')
    expect(out).not.toContain('supersecret')
    expect(out).toContain('[url]')
  })

  it('returns null for empty', () => {
    expect(sanitizeDispatchLastError(null)).toBeNull()
    expect(sanitizeDispatchLastError('   ')).toBeNull()
  })
})
