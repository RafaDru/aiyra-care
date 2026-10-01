import { afterEach, describe, expect, it } from 'vitest'
import { isDefectFixTier1Enabled } from '../src/domain/ops/investigator-tier.js'

describe('isDefectFixTier1Enabled', () => {
  afterEach(() => {
    delete process.env.OPS_DEFECT_FIX_TIER1
    delete process.env.OPS_INVESTIGATOR_TIER1
  })

  it('inherits OPS_INVESTIGATOR_TIER1 when defect env unset', () => {
    process.env.OPS_INVESTIGATOR_TIER1 = '1'
    expect(isDefectFixTier1Enabled()).toBe(true)
  })

  it('OPS_DEFECT_FIX_TIER1=0 overrides investigator tier', () => {
    process.env.OPS_INVESTIGATOR_TIER1 = '1'
    process.env.OPS_DEFECT_FIX_TIER1 = '0'
    expect(isDefectFixTier1Enabled()).toBe(false)
  })

  it('OPS_DEFECT_FIX_TIER1=1 enables tier without investigator flag', () => {
    process.env.OPS_DEFECT_FIX_TIER1 = '1'
    expect(isDefectFixTier1Enabled()).toBe(true)
  })
})
