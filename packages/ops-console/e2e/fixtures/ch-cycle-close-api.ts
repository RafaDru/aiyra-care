import type {
  IncidentDefectCycleMetrics,
  OpsMetricsResponse,
  PlatformDefectItem,
} from '../../src/client/ops.types.js'

export const MOCK_DEFECT_ID = 'd1111111-1111-4111-8111-111111111111'

export function mockReadyForPrDefect(
  partial: Partial<PlatformDefectItem> = {},
): PlatformDefectItem {
  return {
    id: MOCK_DEFECT_ID,
    referenceCode: 'DEF-000003',
    title: 'Piloto ciclo CH — correção merge',
    status: 'ready_for_pr',
    fingerprint: 'fp-cycle-close',
    impact: 2,
    applications: ['web'],
    ownerSubject: null,
    triageSummary: 'Triagem simulada para E2E',
    triageArtifactPath: null,
    branchName: 'cursor/ops-ch-cycle-close-e2e',
    prUrl: 'https://github.com/RafaDru/aiyra-care/pull/999',
    mergedPrUrl: null,
    mergedAt: null,
    fixedVia: null,
    prBatchId: null,
    firstSeenAt: '2026-10-01T10:00:00.000Z',
    fixStartedAt: '2026-10-01T11:00:00.000Z',
    lastFixDispatchSentAt: '2026-10-01T11:05:00.000Z',
    readyForPrAt: '2026-10-01T12:00:00.000Z',
    fixedAt: null,
    lastFailureKind: null,
    lastFailureSummary: null,
    lastCorrectionFailureDetails: null,
    correctionFailedAt: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    pipelineStatus: 'approved_for_merge',
    incidentCount: 1,
    latestReview: {
      id: 'rev-e2e-1',
      status: 'completed',
      recommendation: 'approve',
      correctionEffectiveness: 'plausible',
      riskLevel: 'baixo',
      riskSummary: 'Sem risco clínico',
      securityVerdict: 'pass',
      securitySummary: 'Sem credenciais expostas',
      recommendationRationale: 'Correção alinhada ao defeito',
      completedAt: '2026-10-01T12:30:00.000Z',
      prReviewCommentUrl: null,
      agentRunUrl: null,
    },
    ...partial,
  }
}

export function mockCycleMetrics(): IncidentDefectCycleMetrics {
  return {
    windowDays: 7,
    generatedAt: new Date().toISOString(),
    incidents: { open: 2, resolvedInWindow: 1 },
    defects: {
      inFix: 0,
      awaitingMerge: 1,
      fixedInWindow: 1,
      avgDaysToFixed: 1.2,
    },
  }
}

const emptyPercentiles = {
  windowHours: 24,
  turns: 0,
  tokensTotalSum: 0,
  tokensInSum: 0,
  tokensOutSum: 0,
  p50Tokens: null,
  p95Tokens: null,
}

export function mockOpsMetricsResponse(): OpsMetricsResponse {
  const generatedAt = new Date().toISOString()
  return {
    metrics: {
      generatedAt,
      ava: { last24h: emptyPercentiles, last7d: emptyPercentiles, providerMix24h: [] },
      sync: { portalStats24h: [], stuckJobs: [], recentFailures: [] },
      productEvents: {
        last1h: {
          windowHours: 1,
          avaChatCompleted: 0,
          avaChatFailed: 0,
          avaQuotaBlocked: 0,
        },
        last5m: { avaChatCompleted: 0, avaChatFailed: 0 },
      },
      errorFingerprints24h: [],
      clientErrorFingerprints24h: [],
      featureHealth24h: [],
      featureCatalog: [],
      timeSeries24h: {
        syncJobs: [],
        avaEvents: [],
        clientErrors: [],
        avaTokens: [],
        supportReportsSubmitted: [],
      },
      probe: {
        checkedAt: generatedAt,
        api: { ok: true, latencyMs: 12 },
        postgres: { ok: true, latencyMs: 4 },
        web: { ok: true, latencyMs: 8 },
      },
      supportReports: { openCount: 0, submitted24h: 0 },
    },
    alerts: [],
  }
}
