import { describe, expect, it, vi } from 'vitest'
import { ClientErrorIncidentBridgeService } from '../src/application/ops/client-error-incident-bridge.service.js'
import { computeClientErrorFingerprint } from '../src/domain/telemetry/client-error.js'
import type { ClientErrorIncidentBridgeConfig } from '../src/domain/ops/client-error-incident-bridge.types.js'

function enabledConfig(): ClientErrorIncidentBridgeConfig {
  return {
    enabled: true,
    features: new Set(['account_settings', 'ui']),
    dedupeMs: 60_000,
    minCount: 1,
    apiPathPrefixes: ['/auth', '/account', '/patients'],
    sreFeatures: new Set(),
  }
}

describe('ClientErrorIncidentBridgeService', () => {
  it('enqueues once per fingerprint; second call blocked by dedupe', async () => {
    const tryAcquire = vi
      .fn()
      .mockResolvedValueOnce({ acquired: true })
      .mockResolvedValueOnce({ acquired: false, reason: 'dedupe_window' })
    const attachQueueId = vi.fn(async () => undefined)
    const enqueueClientErrorSignal = vi.fn(async () => ({
      id: 'queue-1',
      sourceType: 'ops_alert',
      sourceId: 'client_error:abc',
      incidentPipelineStatus: 'open',
    }))
    const signals = { tryAcquireEnqueueSlot: tryAcquire, attachQueueId }
    const queueService = { enqueueClientErrorSignal }
    const bridge = new ClientErrorIncidentBridgeService(
      enabledConfig(),
      signals as never,
      queueService as never,
    )

    const fp = computeClientErrorFingerprint('account_settings', 'api', 'HTTP_500')
    const error = {
      fingerprint: fp,
      feature: 'account_settings',
      errorKind: 'api' as const,
      errorCode: 'HTTP_500',
      properties: { api_path: '/auth/profile' },
    }

    await bridge.onIngestedErrors([error], { accountId: 'acc-1', deploymentTier: 'local' })
    await bridge.onIngestedErrors([error], { accountId: 'acc-1', deploymentTier: 'local' })

    expect(enqueueClientErrorSignal).toHaveBeenCalledTimes(1)
    expect(attachQueueId).toHaveBeenCalledWith(fp, 'local', 'queue-1')
  })

  it('skips features outside allowlist', async () => {
    const tryAcquire = vi.fn()
    const enqueueClientErrorSignal = vi.fn()
    const bridge = new ClientErrorIncidentBridgeService(
      enabledConfig(),
      { tryAcquireEnqueueSlot: tryAcquire, attachQueueId: vi.fn() } as never,
      { enqueueClientErrorSignal } as never,
    )
    const fp = computeClientErrorFingerprint('patient_detail', 'api', 'HTTP_404')
    await bridge.onIngestedErrors(
      [{
        fingerprint: fp,
        feature: 'patient_detail',
        errorKind: 'api',
        errorCode: 'HTTP_404',
      }],
      { accountId: null, deploymentTier: 'local' },
    )
    expect(tryAcquire).not.toHaveBeenCalled()
    expect(enqueueClientErrorSignal).not.toHaveBeenCalled()
  })

  it('handleServerError respects API prefix allowlist', async () => {
    const tryAcquire = vi.fn(async () => ({ acquired: true }))
    const enqueueClientErrorSignal = vi.fn(async () => ({ id: 'q2' }))
    const bridge = new ClientErrorIncidentBridgeService(
      enabledConfig(),
      { tryAcquireEnqueueSlot: tryAcquire, attachQueueId: vi.fn() } as never,
      { enqueueClientErrorSignal } as never,
    )
    await bridge.handleServerError({
      path: '/health/db',
      statusCode: 500,
      accountId: null,
      deploymentTier: 'local',
    })
    expect(enqueueClientErrorSignal).not.toHaveBeenCalled()

    await bridge.handleServerError({
      path: '/auth/profile',
      statusCode: 500,
      accountId: 'a1',
      deploymentTier: 'local',
    })
    expect(enqueueClientErrorSignal).toHaveBeenCalledTimes(1)
  })
})
