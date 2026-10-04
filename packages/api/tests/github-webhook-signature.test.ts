import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyGithubWebhookSignature } from '../src/domain/ops/github-webhook-signature.js'

describe('verifyGithubWebhookSignature', () => {
  it('accepts valid sha256 HMAC', () => {
    const secret = 'test-secret'
    const body = Buffer.from('{"action":"closed"}')
    const sig = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
    expect(verifyGithubWebhookSignature(body, sig, secret)).toBe(true)
  })

  it('rejects wrong secret', () => {
    const body = Buffer.from('{}')
    const sig = `sha256=${createHmac('sha256', 'a').update(body).digest('hex')}`
    expect(verifyGithubWebhookSignature(body, sig, 'b')).toBe(false)
  })
})
