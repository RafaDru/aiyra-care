import { describe, it, expect } from 'vitest'
import {
  isUnimedSessionUsable,
  isUnimedLoginPage,
  unimedSessionExpiresAt,
} from '../src/infrastructure/scraper/unimedbh-login.helper.js'

describe('unimedbh-login.helper', () => {
  it('isUnimedLoginPage detects SSO host', () => {
    expect(isUnimedLoginPage('https://acesso.unimedbh.com.br/?force=true')).toBe(true)
    expect(isUnimedLoginPage('https://app.unimedbh.com.br/PortalDoCliente/')).toBe(false)
  })
  it('isUnimedSessionUsable respects expiry', () => {
    const future = new Date(Date.now() + 120_000)
    const past = new Date(Date.now() - 60_000)
    expect(isUnimedSessionUsable(future)).toBe(true)
    expect(isUnimedSessionUsable(past)).toBe(false)
    expect(isUnimedSessionUsable(null)).toBe(false)
  })

  it('unimedSessionExpiresAt is in the future', () => {
    expect(unimedSessionExpiresAt().getTime()).toBeGreaterThan(Date.now())
  })
})
