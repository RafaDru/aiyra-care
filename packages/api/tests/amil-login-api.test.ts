import { describe, it, expect } from 'vitest'

// Token extraction mirrors amil-sync.scraper login response parsing
function extractTokenFromLoginJson(json: unknown): string {
  const rec = json && typeof json === 'object' && !Array.isArray(json) ? json as Record<string, unknown> : null
  if (!rec) return ''
  const data = rec.data && typeof rec.data === 'object' ? rec.data as Record<string, unknown> : null
  const token = rec.token ?? data?.token
  return typeof token === 'string' && token.trim() ? token.trim() : ''
}

describe('amil login token extraction', () => {
  it('reads token from root or data', () => {
    expect(extractTokenFromLoginJson({ token: 'abc' })).toBe('abc')
    expect(extractTokenFromLoginJson({ data: { token: 'xyz' } })).toBe('xyz')
    expect(extractTokenFromLoginJson({})).toBe('')
  })
})
