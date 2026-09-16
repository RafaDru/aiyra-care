import type { UserEscalationDispatchPayload } from '../../domain/user-escalation/user-escalation.types.js'

export function resolveUserEscalationWebhookUrl(): string | undefined {
  const dedicated = process.env.USER_ESCALATION_WEBHOOK_URL?.trim()
  if (dedicated) return dedicated
  return process.env.OPS_ALERT_WEBHOOK_URL?.trim() || undefined
}

export function resolveUserEscalationAppUrl(): string | undefined {
  const explicit = process.env.USER_ESCALATION_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const api = process.env.API_PUBLIC_URL?.trim()
  if (api) {
    return api.replace(/:\d+$/, ':5173').replace(/\/$/, '')
  }
  return 'http://localhost:5173'
}

export function buildUserEscalationPayload(
  status: 'open' | 'resolved',
  message: string,
): UserEscalationDispatchPayload {
  const appUrl = resolveUserEscalationAppUrl()
  return {
    type: 'user_sync_escalation',
    status,
    message,
    appUrl,
    checkedAt: new Date().toISOString(),
  }
}

export async function dispatchUserEscalation(
  payload: UserEscalationDispatchPayload,
): Promise<boolean> {
  const webhook = resolveUserEscalationWebhookUrl()
  if (!webhook) return false
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`USER_ESCALATION_WEBHOOK failed: HTTP ${res.status}`)
  }
  return true
}
