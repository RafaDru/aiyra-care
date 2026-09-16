import type { TransactionalEmailMessage, TransactionalEmailPort } from '../../domain/notifications/transactional-email.types.js'

export function resolveTransactionalEmailFrom(): string | undefined {
  return process.env.TRANSACTIONAL_EMAIL_FROM?.trim() || undefined
}

export function resolveTransactionalEmailReplyTo(): string | undefined {
  return process.env.TRANSACTIONAL_EMAIL_REPLY_TO?.trim()
    || process.env.LEGAL_SUPPORT_EMAIL?.trim()
    || undefined
}

export function isTransactionalEmailEnabled(): boolean {
  const provider = process.env.TRANSACTIONAL_EMAIL_PROVIDER?.trim().toLowerCase()
  if (provider === 'noop' || provider === 'off' || provider === '0') return false
  if (provider === 'resend') return Boolean(process.env.RESEND_API_KEY?.trim())
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

export class ResendTransactionalEmailAdapter implements TransactionalEmailPort {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly replyTo?: string,
  ) {}

  async send(message: TransactionalEmailMessage) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        reply_to: message.replyTo ?? this.replyTo,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`TRANSACTIONAL_EMAIL_FAILED:${res.status}:${body.slice(0, 200)}`)
    }
    const json = (await res.json()) as { id?: string }
    return { id: json.id ?? null, skipped: false }
  }
}

export class NoopTransactionalEmailAdapter implements TransactionalEmailPort {
  async send() {
    return { id: null, skipped: true }
  }
}

export function createTransactionalEmailAdapter(): TransactionalEmailPort {
  if (!isTransactionalEmailEnabled()) return new NoopTransactionalEmailAdapter()
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = resolveTransactionalEmailFrom()
  if (!apiKey || !from) return new NoopTransactionalEmailAdapter()
  return new ResendTransactionalEmailAdapter(apiKey, from, resolveTransactionalEmailReplyTo())
}
