import { describe, expect, it } from 'vitest'
import { isOpsPlannedMaintenanceActive } from '../src/domain/ops/ops-planned-maintenance.js'

describe('API health plannedMaintenance contract', () => {
  it('reflects env flag for health payload', () => {
    expect(
      isOpsPlannedMaintenanceActive({ OPS_PLANNED_MAINTENANCE: '0' }),
    ).toBe(false)
    expect(
      isOpsPlannedMaintenanceActive({ OPS_PLANNED_MAINTENANCE: '1' }),
    ).toBe(true)
  })
})
