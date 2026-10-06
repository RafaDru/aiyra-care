import { describe, expect, it } from 'vitest'
import { parseFailureProbeOptOutCsv } from '../src/lib/failure-probe-policy.ts'

describe('parseFailureProbeOptOutCsv', () => {
  it('parses csv and ignores none', () => {
    expect(parseFailureProbeOptOutCsv('')).toEqual(new Set())
    expect(parseFailureProbeOptOutCsv('none')).toEqual(new Set())
    expect(parseFailureProbeOptOutCsv('ava_companion, patient_wallet')).toEqual(
      new Set(['ava_companion', 'patient_wallet']),
    )
  })

  it('normalizes to lowercase', () => {
    expect(parseFailureProbeOptOutCsv('Ava_Companion')).toEqual(new Set(['ava_companion']))
  })
})
