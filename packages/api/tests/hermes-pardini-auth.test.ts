import { describe, expect, it } from 'vitest'
import {
  buildHermesPardiniSession,
  formatHermesPardiniUsername,
  isHermesPardiniSessionValid,
  sessionExpiresAtFromToken,
} from '../src/infrastructure/scraper/hermes-pardini-auth.js'

describe('hermes-pardini-auth', () => {
  it('formats CPF as digits for Keycloak username', () => {
    expect(formatHermesPardiniUsername('123.456.789-01')).toBe('12345678901')
    expect(formatHermesPardiniUsername('ABC123')).toBe('ABC123')
  })

  it('builds session with JWT expiry', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const exp = Math.floor(Date.now() / 1000) + 3600
    const payload = Buffer.from(JSON.stringify({ sub: 'user-1', name: 'Test', exp })).toString('base64url')
    const token = `${header}.${payload}.sig`
    const session = buildHermesPardiniSession('12345678901', token, 'refresh', {})
    expect(session.subject).toBe('user-1')
    expect(session.name).toBe('Test')
    expect(isHermesPardiniSessionValid(session)).toBe(true)
    expect(sessionExpiresAtFromToken(token).getTime()).toBe(exp * 1000)
  })
})
