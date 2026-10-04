import { describe, expect, it, vi } from 'vitest'
import { resolveIncidentsLinkedToDefect } from '../src/application/ops/incident-pipeline-resolution.js'

describe('resolveIncidentsLinkedToDefect', () => {
  it('delegates to queue repository', async () => {
    const resolveIncidentsLinkedToDefectRepo = vi.fn(async () => 2)
    const count = await resolveIncidentsLinkedToDefect(
      { resolveIncidentsLinkedToDefect: resolveIncidentsLinkedToDefectRepo } as never,
      'defect-1',
    )
    expect(count).toBe(2)
    expect(resolveIncidentsLinkedToDefectRepo).toHaveBeenCalledWith('defect-1')
  })
})
