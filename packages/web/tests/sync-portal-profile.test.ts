import { describe, it, expect } from 'vitest'
import { isInteractiveLoginMessage, isFleuryOtpLoginMessage, resolveSyncStepIndex } from '../src/lib/sync-portal-profile.ts'

describe('resolveSyncStepIndex', () => {
  it('infers fetch step from stepDetails when current step is unknown', () => {
    const idx = resolveSyncStepIndex('pending', 'unimed', {
      login: { status: 'success', message: 'ok' },
      'fetch-plano': { status: 'running', message: 'Plano...' },
    })
    expect(idx).toBe(1)
  })
})

describe('isInteractiveLoginMessage', () => {
  it('does not flag successful API/session messages', () => {
    expect(isInteractiveLoginMessage('Login Amil via API (sem browser)')).toBe(false)
    expect(isInteractiveLoginMessage('Sessão Amil salva (sem browser)...')).toBe(false)
    expect(isInteractiveLoginMessage('Autenticado via API Amil')).toBe(false)
    expect(isInteractiveLoginMessage('Sessão Amil reutilizada')).toBe(false)
  })

  it('flags real manual login prompts', () => {
    expect(isInteractiveLoginMessage('Clique em Entrar no Chrome (login manual)...')).toBe(true)
    expect(isInteractiveLoginMessage('Abrindo Chrome para login Amil...')).toBe(true)
    expect(isInteractiveLoginMessage('conclua o login manualmente no Chrome')).toBe(true)
    expect(isInteractiveLoginMessage('Abrindo Grupo Fleury — no Chrome: CPF → código SMS')).toBe(true)
  })

  it('detects Fleury unified OTP prompts', () => {
    expect(isFleuryOtpLoginMessage('Abrindo Grupo Fleury — no Chrome: CPF → código SMS')).toBe(true)
    expect(isFleuryOtpLoginMessage('OTP não concluído — tentando senha do protocolo (entrada Pardini)…')).toBe(false)
  })
})
