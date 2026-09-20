import { describe, expect, it } from 'vitest'
import { normalizeOpsDeploymentTier } from '../../ops-console/src/client/theme/ops-environment.js'

describe('normalizeOpsDeploymentTier', () => {
  it('prioritizes console port over DEPLOYMENT_TIER from .env', () => {
    expect(normalizeOpsDeploymentTier('integration', 3023)).toBe('preview')
    expect(normalizeOpsDeploymentTier('preview', 3013)).toBe('integration')
  })

  it('falls back to explicit tier when port is unknown', () => {
    expect(normalizeOpsDeploymentTier('preview', 9090)).toBe('preview')
    expect(normalizeOpsDeploymentTier('production', undefined)).toBe('production')
  })

  it('defaults to integration', () => {
    expect(normalizeOpsDeploymentTier(undefined, undefined)).toBe('integration')
    expect(normalizeOpsDeploymentTier('', 4000)).toBe('integration')
  })
})
