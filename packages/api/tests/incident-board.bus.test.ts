import { describe, expect, it, vi } from 'vitest'
import {
  publishIncidentBoardChange,
  resetIncidentBoardBus,
  subscribeIncidentBoard,
} from '../src/infrastructure/ops/incident-board.bus.js'

describe('incident-board.bus', () => {
  it('publish delivers to tier subscribers only', () => {
    resetIncidentBoardBus()
    const integration = vi.fn()
    const preview = vi.fn()
    subscribeIncidentBoard('integration', integration)
    subscribeIncidentBoard('preview', preview)

    publishIncidentBoardChange({
      deploymentTier: 'integration',
      incidentId: 'inc-1',
      incidentPipelineStatus: 'open',
      legacyStatus: 'queued',
      updatedAt: new Date().toISOString(),
      suggestedFilter: 'needs_attention',
    })

    expect(integration).toHaveBeenCalledTimes(1)
    expect(preview).not.toHaveBeenCalled()
  })

  it('unsubscribe stops delivery', () => {
    resetIncidentBoardBus()
    const listener = vi.fn()
    const unsub = subscribeIncidentBoard('integration', listener)
    unsub()
    publishIncidentBoardChange({
      deploymentTier: 'integration',
      incidentId: 'inc-2',
      incidentPipelineStatus: 'triaged',
      legacyStatus: 'fix_proposed',
      updatedAt: new Date().toISOString(),
      suggestedFilter: 'triaged',
    })
    expect(listener).not.toHaveBeenCalled()
  })
})
