import { describe, expect, it } from 'vitest'
import { isComplianceExemptPath, isComplianceGateEnabled } from '../src/infrastructure/http/legal-compliance/compliance-gate.js'

describe('compliance-gate', () => {
  it('exempts status, accept and account deletion routes', () => {
    expect(isComplianceExemptPath('/compliance/status')).toBe(true)
    expect(isComplianceExemptPath('/compliance/accept')).toBe(true)
    expect(isComplianceExemptPath('/auth/account')).toBe(true)
    expect(isComplianceExemptPath('/patients')).toBe(false)
  })

  it('gate disabled by default', () => {
    const prev = process.env.COMPLIANCE_GATE_ENABLED
    delete process.env.COMPLIANCE_GATE_ENABLED
    expect(isComplianceGateEnabled()).toBe(false)
    process.env.COMPLIANCE_GATE_ENABLED = '1'
    expect(isComplianceGateEnabled()).toBe(true)
    process.env.COMPLIANCE_GATE_ENABLED = prev
  })
})
