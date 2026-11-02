import { describe, expect, it } from 'vitest'
import { isPublicCompliancePath } from '../src/lib/public-compliance-path.js'

describe('isPublicCompliancePath', () => {
  it('allows public compliance reads', () => {
    expect(isPublicCompliancePath('/compliance/documents')).toBe(true)
    expect(isPublicCompliancePath('/compliance/contact')).toBe(true)
    expect(isPublicCompliancePath('/compliance/go-live-status')).toBe(true)
    expect(isPublicCompliancePath('/compliance/documents/terms_of_use/current')).toBe(true)
    expect(isPublicCompliancePath('/compliance/documents/privacy_policy/current?cache=1')).toBe(true)
  })

  it('requires auth for protected compliance routes', () => {
    expect(isPublicCompliancePath('/compliance/status')).toBe(false)
    expect(isPublicCompliancePath('/compliance/accept')).toBe(false)
    expect(isPublicCompliancePath('/compliance/documents/terms_of_use')).toBe(false)
    expect(isPublicCompliancePath('/patients')).toBe(false)
  })
})
