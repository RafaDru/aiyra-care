import { describe, expect, it } from 'vitest'
import {
  FLEURY_OTP_IN_APP_MARKER,
  fleuryPrecisionOtpInAppMessage,
  isAwaitingHermesPardiniOtp,
  registerHermesPardiniOtpSession,
  submitHermesPardiniOtpCode,
  unregisterHermesPardiniOtpSession,
  waitHermesPardiniOtpCode,
} from '../src/infrastructure/scraper/hermes-pardini-otp-session.js'

describe('hermes-pardini-otp-session', () => {
  const jobId = '00000000-0000-4000-8000-000000000001'

  it('includes stable marker in in-app message', () => {
    expect(fleuryPrecisionOtpInAppMessage()).toContain(FLEURY_OTP_IN_APP_MARKER)
  })

  it('accepts OTP code and resolves waiter', async () => {
    registerHermesPardiniOtpSession(jobId, {} as never)
    expect(isAwaitingHermesPardiniOtp(jobId)).toBe(true)

    const codePromise = waitHermesPardiniOtpCode(jobId, 5000)
    expect(submitHermesPardiniOtpCode(jobId, '12-34-56')).toBe(true)
    await expect(codePromise).resolves.toBe('123456')

    unregisterHermesPardiniOtpSession(jobId)
    expect(isAwaitingHermesPardiniOtp(jobId)).toBe(false)
  })

  it('rejects invalid code length', () => {
    registerHermesPardiniOtpSession(jobId, {} as never)
    waitHermesPardiniOtpCode(jobId, 5000).catch(() => {})
    expect(submitHermesPardiniOtpCode(jobId, '12')).toBe(false)
    unregisterHermesPardiniOtpSession(jobId)
  })
})
