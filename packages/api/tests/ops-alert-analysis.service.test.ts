import { describe, expect, it, vi, afterEach } from 'vitest'
import { OpsAlertAnalysisService } from '../src/application/ops/ops-alert-analysis.service.js'
import { OpsAlertAnalysisMemoryStore, resetOpsAlertAnalysisMemoryStore } from '../src/application/ops/ops-alert-analysis-memory.store.js'

describe('OpsAlertAnalysisService', () => {
  afterEach(() => {
    resetOpsAlertAnalysisMemoryStore()
    delete process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL
    delete process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_KEY
    vi.unstubAllGlobals()
  })

  it('stores in_progress after successful manual dispatch', async () => {
    process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL = 'http://127.0.0.1:3099/cursor-automation'
    process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_KEY = 'crsr_test_key'
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200 })))

    const store = new OpsAlertAnalysisMemoryStore()
    const svc = new OpsAlertAnalysisService(store)
    const alert = {
      id: 'infra_api_down',
      severity: 'critical' as const,
      category: 'infra' as const,
      message: 'API down',
    }
    const result = await svc.requestAnalysis(alert, {
      operatorNotes: 'porta ocupada',
      trigger: 'manual',
      checkedAt: '2026-09-08T12:00:00.000Z',
    })
    expect(result.ok).toBe(true)
    const row = store.get('infra_api_down')
    expect(row.analysisStatus).toBe('in_progress')
    expect(row.operatorNotes).toBe('porta ocupada')
  })

  it('completeAnalysis marks completed', () => {
    const store = new OpsAlertAnalysisMemoryStore()
    const svc = new OpsAlertAnalysisService(store)
    const ok = svc.completeAnalysis('infra_api_down', {
      analysisSummary: 'API reiniciada via up.ps1',
      analysisArtifactPath: 'docs/ops/investigations/2026-09-08-infra_api_down.md',
    })
    expect(ok).toBe(true)
    expect(store.get('infra_api_down').analysisStatus).toBe('completed')
  })
})
