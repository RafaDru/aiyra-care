import { afterEach, describe, expect, it } from 'vitest'
import { isStackControlEnabled } from '../../ops-console/src/stack-control.js'

describe('isStackControlEnabled', () => {
  const prev = process.env.OPS_STACK_CONTROL_ENABLED

  afterEach(() => {
    if (prev === undefined) delete process.env.OPS_STACK_CONTROL_ENABLED
    else process.env.OPS_STACK_CONTROL_ENABLED = prev
  })

  it('returns false when OPS_STACK_CONTROL_ENABLED=0', () => {
    process.env.OPS_STACK_CONTROL_ENABLED = '0'
    expect(isStackControlEnabled()).toBe(false)
  })

  it('returns true when OPS_STACK_CONTROL_ENABLED=1 even off Windows', () => {
    process.env.OPS_STACK_CONTROL_ENABLED = '1'
    expect(isStackControlEnabled()).toBe(true)
  })
})
