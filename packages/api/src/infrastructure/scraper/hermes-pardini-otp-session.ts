import type { Page } from 'playwright'

/** Marcador estável na mensagem de progresso — UI detecta modal OTP in-app. */
export const FLEURY_OTP_IN_APP_MARKER = '[[fleury_otp_in_app]]'

export function fleuryPrecisionOtpInAppMessage(): string {
  return `${FLEURY_OTP_IN_APP_MARKER} Digite o código recebido por SMS, e-mail ou WhatsApp`
}

interface OtpSessionEntry {
  page: Page
  createdAt: number
  resolve?: (code: string) => void
  reject?: (err: Error) => void
  timer?: ReturnType<typeof setTimeout>
}

const sessions = new Map<string, OtpSessionEntry>()

export function registerHermesPardiniOtpSession(jobId: string, page: Page): void {
  sessions.set(jobId, { page, createdAt: Date.now() })
}

export function unregisterHermesPardiniOtpSession(jobId: string): void {
  const entry = sessions.get(jobId)
  if (entry?.timer) clearTimeout(entry.timer)
  sessions.delete(jobId)
}

export function isAwaitingHermesPardiniOtp(jobId: string): boolean {
  return sessions.has(jobId)
}

export function waitHermesPardiniOtpCode(jobId: string, timeoutMs: number): Promise<string> {
  const entry = sessions.get(jobId)
  if (!entry) {
    return Promise.reject(new Error('Sessão OTP Grupo Fleury não registrada para este job'))
  }

  return new Promise<string>((resolve, reject) => {
    entry.resolve = resolve
    entry.reject = reject
    entry.timer = setTimeout(() => {
      entry.reject?.(new Error('Tempo esgotado aguardando código OTP no app'))
      unregisterHermesPardiniOtpSession(jobId)
    }, timeoutMs)
  })
}

export function submitHermesPardiniOtpCode(jobId: string, code: string): boolean {
  const entry = sessions.get(jobId)
  if (!entry?.resolve) return false

  const digits = code.replace(/\D/g, '')
  if (digits.length < 4 || digits.length > 8) return false

  if (entry.timer) clearTimeout(entry.timer)
  const resolve = entry.resolve
  entry.resolve = undefined
  entry.reject = undefined
  resolve(digits)
  return true
}

export function rejectHermesPardiniOtpSession(jobId: string, err: Error): void {
  const entry = sessions.get(jobId)
  if (!entry) return
  if (entry.timer) clearTimeout(entry.timer)
  entry.reject?.(err)
  unregisterHermesPardiniOtpSession(jobId)
}
