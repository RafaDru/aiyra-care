import { describe, expect, it, vi, afterEach } from 'vitest'
import { isInternalRoadmapEnabled } from '../src/lib/internal-product-ui.js'

describe('isInternalRoadmapEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is false when unset', () => {
    vi.stubEnv('VITE_INTERNAL_ROADMAP', '')
    expect(isInternalRoadmapEnabled()).toBe(false)
  })

  it('is true for 1 or true', () => {
    vi.stubEnv('VITE_INTERNAL_ROADMAP', '1')
    expect(isInternalRoadmapEnabled()).toBe(true)
    vi.stubEnv('VITE_INTERNAL_ROADMAP', 'true')
    expect(isInternalRoadmapEnabled()).toBe(true)
  })
})
