import { afterEach, describe, expect, it } from 'vitest'
import {
  resolveDeploymentTier,
  resolveInvestigatorEnvironmentContext,
} from '../src/domain/ops/investigator-environment.js'

describe('investigator-environment', () => {
  afterEach(() => {
    delete process.env.DEPLOYMENT_TIER
    delete process.env.API_PUBLIC_URL
    delete process.env.PORT
    delete process.env.API_PUBLIC_HOST
  })

  it('resolveDeploymentTier uses DEPLOYMENT_TIER only', () => {
    process.env.DEPLOYMENT_TIER = 'preview'
    process.env.PORT = '3010'
    expect(resolveDeploymentTier()).toBe('preview')
  })

  it('defaults to integration when unset or invalid', () => {
    expect(resolveDeploymentTier()).toBe('integration')
    process.env.DEPLOYMENT_TIER = 'staging'
    expect(resolveDeploymentTier()).toBe('integration')
  })

  it('resolveInvestigatorEnvironmentContext prefers API_PUBLIC_URL', () => {
    process.env.DEPLOYMENT_TIER = 'production'
    process.env.API_PUBLIC_URL = 'https://api.aiyracare.example/'
    expect(resolveInvestigatorEnvironmentContext()).toEqual({
      deploymentTier: 'production',
      apiPublicUrl: 'https://api.aiyracare.example',
    })
  })
})
