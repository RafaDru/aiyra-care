export interface TransactionalEmailMessage {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
}

export interface TransactionalEmailPort {
  send(message: TransactionalEmailMessage): Promise<{ id: string | null; skipped: boolean }>
}
