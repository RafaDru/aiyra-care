/**
 * Console de observabilidade independente do app Aiyra (API :3010 / web :5173).
 * Lê Postgres diretamente, sonda a API como target monitorado, serve UI em :3013.
 */
import { loadMonorepoEnv } from '../../api/src/infrastructure/load-monorepo-env.js'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync } from 'fs'
import Fastify, { type FastifyInstance } from 'fastify'
import middie from '@fastify/middie'
import fastifyStatic from '@fastify/static'
import { createServer as createViteServer, type ViteDevServer } from 'vite'
import pg from 'pg'
import { OpsMetricsService } from '../../api/src/application/ops/ops-metrics.service.js'
import { OpsAlertDispatchService } from '../../api/src/application/ops/ops-alert-dispatch.service.js'
import { OpsMetricsPgRepository } from '../../api/src/infrastructure/persistence/ops-metrics.pg.repository.js'
import { LlmInternalCostService } from '../../api/src/application/llm/llm-internal-cost.service.js'
import { LlmUsagePgRepository } from '../../api/src/infrastructure/persistence/llm-usage.pg.repository.js'
import { LlmInternalBudgetPgRepository } from '../../api/src/infrastructure/persistence/llm-internal-budget.pg.repository.js'
import { RuntimeDegradedService } from '../../api/src/application/ops/runtime-degraded.service.js'
import { RuntimeDegradedPgRepository } from '../../api/src/infrastructure/persistence/runtime-degraded.pg.repository.js'
import { SupportReportPgRepository } from '../../api/src/infrastructure/persistence/support-report.pg.repository.js'
import { OpsSupportReportService } from '../../api/src/application/ops/ops-support-report.service.js'
import { OpsAlertAnalysisService } from '../../api/src/application/ops/ops-alert-analysis.service.js'
import { OpsAlertIncidentPgRepository } from '../../api/src/infrastructure/persistence/ops-alert-incident.pg.repository.js'
import { OpsAnalysisQueuePgRepository } from '../../api/src/infrastructure/persistence/ops-analysis-queue.pg.repository.js'
import { OpsAnalysisQueueService } from '../../api/src/application/ops/ops-analysis-queue.service.js'
import {
  PlatformDefectService,
  PlatformDefectTransitionError,
} from '../../api/src/application/ops/platform-defect.service.js'
import { PlatformDefectPgRepository } from '../../api/src/infrastructure/persistence/platform-defect.pg.repository.js'
import { DefectPrBatchPgRepository } from '../../api/src/infrastructure/persistence/defect-pr-batch.pg.repository.js'
import type { PlatformDefectStatus } from '../../api/src/domain/ops/platform-defect.types.js'
import { isInvestigatorCallbackAuthorized } from '../../api/src/application/ops/ops-analysis-callback-url.js'
import type { AgentAnalysisCallbackInput } from '../../api/src/domain/ops/ops-analysis-queue.types.js'
import { runOpsProbe } from '../../api/src/application/ops/ops-probe.service.js'
import { writeOpsMetricsArtifact } from '../../api/src/application/ops/ops-probe-artifact.js'
import { triageOpsAlerts } from '../../api/src/domain/ops/ops-alert-triage.js'
import {
  getStackStatus,
  runStackAction,
  isStackControlEnabled,
} from './stack-control.js'
import { loadProductLifecycle } from './product-lifecycle.js'
import {
  loadStrategyContent,
  loadStrategyManifest,
  type StrategySectionId,
} from './strategy-content.js'
import { fetchServicesStatus } from './services-status.js'

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const monorepoRoot = resolve(pkgRoot, '..', '..')
const clientRoot = resolve(pkgRoot, 'src/client')
const clientIndex = resolve(clientRoot, 'index.html')
loadMonorepoEnv(monorepoRoot)

const port = Number(process.env.OPS_CONSOLE_PORT ?? '3013')
const host = process.env.OPS_CONSOLE_HOST?.trim() || '127.0.0.1'
const isDev = process.env.NODE_ENV !== 'production'
const probeIntervalMs = Number(process.env.OPS_PROBE_INTERVAL_MS ?? '60000')

function resolveDeploymentTier(): 'integration' | 'preview' | 'production' {
  if (port === 3023) return 'preview'
  if (port === 3013) return 'integration'
  const tier = process.env.DEPLOYMENT_TIER?.trim().toLowerCase()
  if (tier === 'preview' || tier === 'production' || tier === 'integration') return tier
  return 'integration'
}

const deploymentTier = resolveDeploymentTier()

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const metricsService = new OpsMetricsService(
  new OpsMetricsPgRepository(pool),
  new LlmInternalCostService(
    new LlmUsagePgRepository(pool),
    new LlmInternalBudgetPgRepository(pool),
  ),
)
const runtimeService = new RuntimeDegradedService(new RuntimeDegradedPgRepository(pool))
const alertIncidentRepo = new OpsAlertIncidentPgRepository(pool)
const supportRepo = new SupportReportPgRepository(pool)
const platformDefectRepo = new PlatformDefectPgRepository(pool)
const defectPrBatchRepo = new DefectPrBatchPgRepository(pool)
const platformDefectService = new PlatformDefectService(platformDefectRepo)
const analysisQueueService = new OpsAnalysisQueueService(
  new OpsAnalysisQueuePgRepository(pool),
  supportRepo,
  alertIncidentRepo,
  platformDefectService,
)
const alertAnalysisService = new OpsAlertAnalysisService(alertIncidentRepo, analysisQueueService)
const dispatchService = new OpsAlertDispatchService(metricsService, alertAnalysisService)
const supportReportService = new OpsSupportReportService(supportRepo, analysisQueueService)

async function runProbeCycle(): Promise<void> {
  try {
    await runOpsProbe(pool)
  } catch (err) {
    console.error('[ops-console] probe failed:', err instanceof Error ? err.message : err)
  }
}

function isViteAssetPath(path: string): boolean {
  return (
    path.startsWith('/@') ||
    path.startsWith('/node_modules/') ||
    path.startsWith('/src/') ||
    /\.[a-zA-Z0-9]+$/.test(path)
  )
}

async function registerClientRoutes(fastify: FastifyInstance, vite?: ViteDevServer) {
  if (vite) {
    await fastify.register(middie)
    fastify.use((req, res, next) => {
      const path = (req.url ?? '').split('?')[0]
      if (!isViteAssetPath(path)) return next()
      return vite.middlewares(req, res, next)
    })

    fastify.get('*', async (req, reply) => {
      const path = req.url.split('?')[0]
      if (path.startsWith('/api/')) {
        return reply.status(404).send({ error: 'not_found' })
      }
      let html = readFileSync(clientIndex, 'utf8')
      html = await vite.transformIndexHtml(req.url, html)
      return reply.type('text/html').send(html)
    })
  } else {
    const clientDist = resolve(pkgRoot, 'dist/client')
    if (!existsSync(clientDist)) {
      throw new Error(`Client build missing: ${clientDist} — run npm run build`)
    }
    await fastify.register(fastifyStatic, { root: clientDist })
    fastify.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) {
        return reply.status(404).send({ error: 'not_found' })
      }
      return reply.sendFile('index.html')
    })
  }
}

async function main() {
  const fastify = Fastify({ logger: false })

  fastify.get('/mock/ch-layout', async (_req, reply) => {
    return reply.redirect('/?mock=ch-layout')
  })

  fastify.get('/health', async () => ({
    service: 'aiyracare-ops-console',
    status: 'ok',
    port,
    deploymentTier,
    layoutVersion: 'ch-shell-v2',
    commandHub: true,
  }))

  fastify.get('/api/services/status', async () => fetchServicesStatus(port))

  let productLifecycleCache: ReturnType<typeof loadProductLifecycle> | undefined

  fastify.get('/api/product-lifecycle', async () => {
    productLifecycleCache = loadProductLifecycle(monorepoRoot)
    return productLifecycleCache
  })

  fastify.get('/api/strategy/manifest', async () => loadStrategyManifest())

  fastify.get<{ Params: { section: string } }>('/api/strategy/content/:section', async (req, reply) => {
    const section = req.params.section?.trim() as StrategySectionId
    if (section !== 'mkt' && section !== 'finance' && section !== 'cx') {
      return reply.status(400).send({ error: 'invalid_strategy_section' })
    }
    try {
      return loadStrategyContent(section)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'strategy_load_failed'
      return reply.status(500).send({ error: message })
    }
  })

  fastify.get('/api/metrics', async () => {
    const payload = await metricsService.getMetrics()
    const runtime = await runtimeService.getPublicView()
    const triage = triageOpsAlerts(payload.alerts)
    const alertAnalysis = await alertAnalysisService.getAll()
    return {
      ...payload,
      runtime,
      triage,
      alertAnalysis,
    }
  })

  fastify.post('/api/alerts/check', async () => {
    await runProbeCycle()
    const result = await dispatchService.checkAndDispatch()
    const metricsPayload = await metricsService.getMetrics()
    await runtimeService.applyFromOps(metricsPayload.alerts, metricsPayload.metrics.probe)
    writeOpsMetricsArtifact({
      generatedAt: new Date().toISOString(),
      metrics: metricsPayload.metrics,
      alerts: metricsPayload.alerts,
    })
    return { ...result, alertAnalysis: await alertAnalysisService.getAll() }
  })

  fastify.post<{ Params: { id: string }; Body: { operatorNotes?: string } }>(
    '/api/ops-alerts/:id/analyze',
    async (req, reply) => {
      const metricsPayload = await metricsService.getMetrics()
      const alert = metricsPayload.alerts.find((a) => a.id === req.params.id)
      if (!alert) {
        return reply.status(404).send({ error: 'not_found', message: 'Alerta não ativo no momento' })
      }
      const triage = triageOpsAlerts(metricsPayload.alerts).find((t) => t.alertId === alert.id)
      const result = await alertAnalysisService.requestAnalysis(alert, {
        triage,
        operatorNotes: req.body?.operatorNotes,
        trigger: 'manual',
        checkedAt: new Date().toISOString(),
        respectCooldown: false,
      })
      if (!result.ok) {
        const code = result.error === 'cooldown' ? 429 : 503
        return reply.status(code).send({ error: result.error, message: result.message })
      }
      return { ...result, alertAnalysis: await alertAnalysisService.getForAlert(alert.id) }
    },
  )

  fastify.post<{
    Params: { id: string }
    Body: { analysisSummary?: string; analysisArtifactPath?: string }
  }>(
    '/api/ops-alerts/:id/complete-analysis',
    async (req, reply) => {
      const ok = await alertAnalysisService.completeAnalysis(req.params.id, {
        analysisSummary: req.body?.analysisSummary,
        analysisArtifactPath: req.body?.analysisArtifactPath,
      })
      if (!ok) return reply.status(400).send({ error: 'invalid_payload' })
      return { ok: true, alertAnalysis: await alertAnalysisService.getForAlert(req.params.id) }
    },
  )

  fastify.get('/api/stack/status', async () => getStackStatus())

  const stackPost = (action: 'start' | 'stop' | 'restart') => async (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
    try {
      return await runStackAction(req, action)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha no stack'
      if (msg.includes('Chave ops')) return reply.status(403).send({ error: msg })
      if (msg.includes('em andamento')) return reply.status(409).send({ error: msg })
      return reply.status(500).send({ error: msg })
    }
  }

  fastify.post('/api/stack/start', stackPost('start'))
  fastify.post('/api/stack/stop', stackPost('stop'))
  fastify.post('/api/stack/restart', stackPost('restart'))

  fastify.get('/api/stack/capabilities', async () => ({
    stackControl: isStackControlEnabled(),
    platform: process.platform,
  }))

  fastify.get<{ Querystring: { status?: string } }>('/api/support-reports', async (req, reply) => {
    const status = (req.query.status ?? 'open') as 'open' | 'triaged' | 'resolved' | 'closed'
    try {
      const rows = await supportReportService.list(status, 50)
      return { reports: rows }
    } catch (err) {
      const code = typeof err === 'object' && err !== null ? (err as { code?: string }).code : undefined
      const message = err instanceof Error ? err.message : 'support_reports_query_failed'
      if (code === '42P01') {
        return reply.status(503).send({
          error: 'schema_outdated',
          message:
            'Tabela support_reports ou ops_analysis_queue ausente — aplique migrations 061–069 no Postgres de integração.',
        })
      }
      if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
        return reply.status(503).send({ error: 'postgres_unavailable', message })
      }
      console.error('[ops-console] support-reports list failed:', message)
      return reply.status(500).send({ error: 'support_reports_query_failed', message })
    }
  })

  fastify.patch<{ Params: { id: string }; Body: { status?: string } }>(
    '/api/support-reports/:id',
    async (req, reply) => {
      const status = req.body?.status
      if (status !== 'triaged' && status !== 'resolved' && status !== 'closed') {
        return reply.status(400).send({ error: 'invalid_status' })
      }
      const ok = await supportReportService.updateStatus(req.params.id, status)
      if (!ok) return reply.status(404).send({ error: 'not_found' })
      return { ok: true }
    },
  )

  fastify.post<{ Params: { id: string }; Body: { operatorNotes?: string } }>(
    '/api/support-reports/:id/analyze',
    async (req, reply) => {
      const result = await supportReportService.requestAnalysis(
        req.params.id,
        req.body?.operatorNotes,
      )
      if (!result.ok) {
        const code = result.error === 'not_found' ? 404 : 503
        return reply.status(code).send({ error: result.error, message: result.message })
      }
      return result
    },
  )

  fastify.post<{
    Params: { id: string }
    Body: {
      analysisSummary?: string
      analysisArtifactPath?: string
      deploymentStatus?: string
      deploymentActions?: Array<{ label: string; kind: string; url?: string; done?: boolean }>
    }
  }>(
    '/api/support-reports/:id/complete-analysis',
    async (req, reply) => {
      const ok = await supportReportService.completeAnalysis(req.params.id, {
        analysisSummary: req.body?.analysisSummary,
        analysisArtifactPath: req.body?.analysisArtifactPath,
        deploymentStatus: req.body?.deploymentStatus,
        deploymentActions: req.body?.deploymentActions,
      })
      if (!ok) return reply.status(400).send({ error: 'invalid_payload' })
      return { ok: true }
    },
  )

  fastify.get('/api/analysis-queue', async () => ({
    items: await analysisQueueService.listOpen(100),
  }))

  fastify.get('/api/analysis-queue/attention-counts', async () =>
    analysisQueueService.attentionCounts(deploymentTier),
  )

  fastify.post<{ Body: AgentAnalysisCallbackInput }>(
    '/api/analysis-queue/callback',
    async (req, reply) => {
      if (!isInvestigatorCallbackAuthorized({
        'x-investigator-callback-key': req.headers['x-investigator-callback-key'] as string,
        'x-internal-ops-key': req.headers['x-internal-ops-key'] as string,
      })) {
        return reply.status(401).send({ error: 'unauthorized' })
      }
      const record = await analysisQueueService.completeFromAgent(req.body ?? {})
      if (!record) return reply.status(400).send({ error: 'invalid_payload' })
      return { ok: true, item: record }
    },
  )

  fastify.post<{ Params: { id: string } }>(
    '/api/analysis-queue/:id/complete',
    async (req, reply) => {
      const ok = await analysisQueueService.markHumanCompleted(req.params.id)
      if (!ok) return reply.status(404).send({ error: 'not_found' })
      return { ok: true }
    },
  )

  fastify.get<{ Querystring: { status?: string; includeFixed?: string } }>(
    '/api/platform-defects',
    async (req) => ({
      items: await platformDefectService.listForOps({
        statusFilter: req.query.status,
        includeFixed: req.query.includeFixed === '1' || req.query.includeFixed === 'true',
      }),
    }),
  )

  fastify.get<{ Params: { id: string } }>('/api/platform-defects/:id', async (req, reply) => {
    const detail = await platformDefectService.getDetail(req.params.id)
    if (!detail) return reply.status(404).send({ error: 'not_found' })
    return detail
  })

  fastify.patch<{
    Params: { id: string }
    Body: { status?: PlatformDefectStatus; branchName?: string; prUrl?: string; skipBatch?: boolean }
  }>('/api/platform-defects/:id/status', async (req, reply) => {
    const status = req.body?.status
    if (!status) return reply.status(400).send({ error: 'invalid_payload' })
    try {
      const item = await platformDefectService.transition(req.params.id, status, {
        branchName: req.body.branchName,
        prUrl: req.body.prUrl,
        skipBatch: req.body.skipBatch,
      })
      return { ok: true, item }
    } catch (err) {
      if (err instanceof PlatformDefectTransitionError) {
        if (err.code === 'not_found') return reply.status(404).send({ error: err.code })
        return reply.status(409).send({ error: err.code })
      }
      throw err
    }
  })

  fastify.post<{ Params: { id: string } }>(
    '/api/platform-defects/:id/start-fix',
    async (req, reply) => {
      try {
        const item = await platformDefectService.startFix(req.params.id)
        return { ok: true, item }
      } catch (err) {
        if (err instanceof PlatformDefectTransitionError) {
          if (err.code === 'not_found') return reply.status(404).send({ error: err.code })
          return reply.status(409).send({ error: err.code })
        }
        throw err
      }
    },
  )

  fastify.get('/api/defect-pr-batches/config', async () => {
    const intervalMs = Number(process.env.OPS_DEFECT_PR_BATCH_INTERVAL_MS ?? 21_600_000)
    const readyCount = await defectPrBatchRepo.countReadyWithoutBatch()
    const nextWindowAt = new Date(
      Math.ceil(Date.now() / intervalMs) * intervalMs,
    ).toISOString()
    return { intervalMs, readyCount, nextWindowAt }
  })

  fastify.post<{ Params: { id: string }; Body: { incidentId?: string; linkedBy?: string } }>(
    '/api/platform-defects/:id/link-incident',
    async (req, reply) => {
      const incidentId = req.body?.incidentId?.trim()
      if (!incidentId) return reply.status(400).send({ error: 'invalid_payload' })
      try {
        await platformDefectService.linkIncident(
          req.params.id,
          incidentId,
          req.body.linkedBy?.trim() || 'ops_manual',
        )
        return { ok: true }
      } catch (err) {
        if (err instanceof PlatformDefectTransitionError && err.code === 'not_found') {
          return reply.status(404).send({ error: err.code })
        }
        throw err
      }
    },
  )

  const vite = isDev
    ? await createViteServer({
        configFile: resolve(pkgRoot, 'vite.config.ts'),
        server: { middlewareMode: true },
        appType: 'custom',
      })
    : undefined

  await registerClientRoutes(fastify, vite)

  let probeTimer: ReturnType<typeof setInterval> | undefined
  let shuttingDown = false

  const shutdown = async () => {
    if (shuttingDown) return
    shuttingDown = true
    if (probeTimer) clearInterval(probeTimer)
    try {
      if (vite) await vite.close()
      await fastify.close()
      await pool.end()
    } catch (err) {
      console.error('[ops-console] shutdown error:', err instanceof Error ? err.message : err)
    }
  }

  const onSignal = () => shutdown().finally(() => process.exit(0))
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)

  try {
    await fastify.listen({ port, host })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('EADDRINUSE')) {
      console.error(`[ops-console] porta ${port} em uso — rode scripts/ops-console-up.ps1`)
    }
    throw err
  }

  productLifecycleCache = loadProductLifecycle(monorepoRoot)
  console.log(`[ops-console] http://${host}:${port} (command hub · ${deploymentTier})`)

  await runProbeCycle()
  probeTimer = setInterval(() => runProbeCycle(), probeIntervalMs)
  probeTimer.unref()
}

main().catch(async (err) => {
  console.error(err)
  await pool.end()
  process.exit(1)
})
