import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyGithubWebhookSignature(
  payload: Buffer | string,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!secret.trim() || !signatureHeader?.startsWith('sha256=')) return false
  const digest = createHmac('sha256', secret).update(payload).digest('hex')
  const expected = `sha256=${digest}`
  const sigBuf = Buffer.from(signatureHeader)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length) return false
  return timingSafeEqual(sigBuf, expBuf)
}
