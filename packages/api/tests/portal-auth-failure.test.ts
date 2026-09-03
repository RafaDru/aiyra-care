import { describe, expect, it } from 'vitest'
import {
  classifyPortalAuthFailure,
  authAttentionFromFailure,
  userMessageForAuthFailure,
} from '../src/domain/portal-auth/portal-auth-failure.js'

describe('portal-auth-failure', () => {
  it('classifies invalid password', () => {
    expect(classifyPortalAuthFailure('Senha incorreta')).toBe('credentials_invalid')
    expect(authAttentionFromFailure('credentials_invalid')).toBe('credentials')
  })

  it('classifies session expiry', () => {
    expect(classifyPortalAuthFailure('Token expirado', 401)).toBe('session_expired')
    expect(authAttentionFromFailure('session_expired')).toBe('session')
  })

  it('classifies timeout', () => {
    expect(classifyPortalAuthFailure('Sincronização expirou (timeout)')).toBe('timeout')
    expect(authAttentionFromFailure('timeout')).toBe('none')
  })

  it('builds user message for credentials', () => {
    const msg = userMessageForAuthFailure('amil', 'credentials_invalid')
    expect(msg).toMatch(/Amil/)
    expect(msg).toMatch(/credenciais/i)
  })
})
