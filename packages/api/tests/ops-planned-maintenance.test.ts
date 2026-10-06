import { describe, expect, it } from 'vitest'
import { isOpsPlannedMaintenanceActive } from '../src/domain/ops/ops-planned-maintenance.js'

describe('isOpsPlannedMaintenanceActive', () => {
  it('is false when unset', () => {
    expect(isOpsPlannedMaintenanceActive({})).toBe(false)
    expect(isOpsPlannedMaintenanceActive({ OPS_PLANNED_MAINTENANCE: '' })).toBe(false)
    expect(isOpsPlannedMaintenanceActive({ OPS_PLANNED_MAINTENANCE: '0' })).toBe(false)
  })

  it('is true for 1, true, yes', () => {
    expect(isOpsPlannedMaintenanceActive({ OPS_PLANNED_MAINTENANCE: '1' })).toBe(true)
    expect(isOpsPlannedMaintenanceActive({ OPS_PLANNED_MAINTENANCE: 'true' })).toBe(true)
    expect(isOpsPlannedMaintenanceActive({ OPS_PLANNED_MAINTENANCE: 'YES' })).toBe(true)
  })
})
