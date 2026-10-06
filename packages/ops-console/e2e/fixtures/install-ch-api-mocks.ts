import type { Page, Route } from '@playwright/test'
import {
  MOCK_DEFECT_ID,
  mockCycleMetrics,
  mockOpsMetricsResponse,
  mockReadyForPrDefect,
} from './ch-cycle-close-api.js'

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

/** Mock CH HTTP APIs (no Postgres / GitHub). */
export async function installChCycleCloseApiMocks(page: Page) {
  const defect = mockReadyForPrDefect()
  const metrics = mockOpsMetricsResponse()
  const cycle = mockCycleMetrics()

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname

    if (path === '/health') {
      return json(route, {
        service: 'aiyracare-ops-console',
        status: 'ok',
        port: 4313,
        deploymentTier: 'integration',
        layoutVersion: 'ch-shell-v2',
        chG3RequireReviewApprove: false,
      })
    }

    if (path === '/api/metrics') {
      return json(route, metrics)
    }

    if (path === '/api/services/status') {
      return json(route, {
        checkedAt: new Date().toISOString(),
        backend: 'up',
        web: 'up',
        apiPort: 3010,
        webPort: 5173,
      })
    }

    if (path === '/api/stack/status') {
      const checkedAt = new Date().toISOString()
      return json(route, {
        action: 'status',
        message: 'mock stack',
        status: {
          checkedAt,
          apiPort: 3010,
          webPort: 5173,
          api: { up: true, status: 200 },
          web: { up: true, status: 200 },
        },
      })
    }

    if (path.startsWith('/api/stack/')) {
      return json(route, { ok: true, message: 'mock' })
    }

    if (path === '/api/analysis-queue/attention-counts') {
      return json(route, {
        queued: 0,
        investigating: 0,
        fixProposed: 0,
        failed: 0,
        totalAttention: 0,
      })
    }

    if (path === '/api/ops/incident-defect-cycle-metrics') {
      return json(route, cycle)
    }

    if (path === '/api/defect-pr-batches/config') {
      return json(route, {
        intervalMs: 3_600_000,
        readyCount: 0,
        nextWindowAt: new Date().toISOString(),
      })
    }

    if (path === '/api/platform-defects/stream') {
      return route.abort()
    }

    if (path === '/api/platform-defects') {
      return json(route, { items: [defect] })
    }

    if (path === `/api/platform-defects/${MOCK_DEFECT_ID}`) {
      return json(route, {
        defect,
        incidents: [
          {
            id: 'i1111111-1111-4111-8111-111111111111',
            title: 'INC piloto E2E',
            referenceCode: 'INC-000007',
          },
        ],
      })
    }

    if (path.startsWith('/api/')) {
      return json(route, { ok: true, items: [] })
    }

    return route.continue()
  })
}
