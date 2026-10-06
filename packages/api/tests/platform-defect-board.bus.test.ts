import { describe, expect, it, vi } from 'vitest'
import {
  publishDefectBoardChange,
  resetDefectBoardBus,
  subscribeDefectBoard,
} from '../src/infrastructure/ops/platform-defect-board.bus.js'

describe('platform-defect-board.bus', () => {
  it('publish delivers defect_updated payload shape', () => {
    resetDefectBoardBus()
    const listener = vi.fn()
    subscribeDefectBoard('integration', listener)

    publishDefectBoardChange({
      deploymentTier: 'integration',
      defectId: 'def-1',
      referenceCode: 'DEF-000001',
      status: 'ready_for_pr',
      updatedAt: new Date().toISOString(),
      suggestedStatusFilter: 'ready_for_pr',
      latestReview: { status: 'completed', recommendation: 'approve' },
    })

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        defectId: 'def-1',
        latestReview: { status: 'completed', recommendation: 'approve' },
      }),
    )
  })
})
