import { describe, expect, it } from 'vitest'
import {
  buildUserEscalationPayload,
  resolveUserEscalationWebhookUrl,
} from '../src/application/user-escalation/user-escalation-dispatch.js'

describe('user-escalation-dispatch', () => {
  it('payload não inclui PHI', () => {
    const payload = buildUserEscalationPayload('open', 'Mensagem genérica sem dados clínicos.')
    expect(payload.type).toBe('user_sync_escalation')
    expect(payload.status).toBe('open')
    expect(payload.message).not.toMatch(/paciente|cpf|exame/i)
    expect(JSON.stringify(payload)).not.toMatch(/patient/i)
  })

  it('webhook dedicado tem prioridade', () => {
    process.env.USER_ESCALATION_WEBHOOK_URL = 'https://example.com/user'
    process.env.OPS_ALERT_WEBHOOK_URL = 'https://example.com/ops'
    expect(resolveUserEscalationWebhookUrl()).toBe('https://example.com/user')
    delete process.env.USER_ESCALATION_WEBHOOK_URL
    expect(resolveUserEscalationWebhookUrl()).toBe('https://example.com/ops')
    delete process.env.OPS_ALERT_WEBHOOK_URL
  })
})
