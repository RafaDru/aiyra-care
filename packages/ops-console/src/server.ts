/**
 * Console de observabilidade independente do app Aiyra (API :3010 / web :5173).
 * Lê Postgres diretamente, sonda a API como target monitorado, serve UI em :3013.
 */
import { config } from 'dotenv'
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
import { runOpsProbe } from '../../api/src/application/ops/ops-probe.service.js'
import { writeOpsMetricsArtifact } from '../../api/src/application/ops/ops-probe-artifact.js'
import { triageOpsAlerts } from '../../api/src/domain/ops/ops-alert-triage.js'
import {
  getStackStatus,
  runStackAction,
  isStackControlEnabled,
} from './stack-control.js'

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const monorepoRoot = resolve(pkgRoot, '..', '..')
const clientRoot = resolve(pkgRoot, 'src/client')
const clientIndex = resolve(clientRoot, 'index.html')
config({ path: resolve(monorepoRoot, '.env') })

const port = Number(process.env.OPS_CONSOLE_PORT ?? '3013')
const host = process.env.OPS_CONSOLE_HOST?.trim() || '127.0.0.1'
const isDev = process.env.NODE_ENV !== 'production'
const probeIntervalMs = Number(process.env.OPS_PROBE_INTERVAL_MS ?? '60000')

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
const dispatchService = new OpsAlertDispatchService(metricsService)

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

  fastify.get('/health', async () => ({
    service: 'aiyracare-ops-console',
    status: 'ok',
    port,
  }))

  fastify.get('/api/metrics', async () => {
    const payload = await metricsService.getMetrics()
    const runtime = await runtimeService.getPublicView()
    const triage = triageOpsAlerts(payload.alerts)
    return { ...payload, runtime, triage }
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
    return result
  })

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

  console.log(`[ops-console] http://${host}:${port} (independent observability console)`)

  await runProbeCycle()
  probeTimer = setInterval(() => runProbeCycle(), probeIntervalMs)
  probeTimer.unref()
}

main().catch(async (err) => {
  console.error(err)
  await pool.end()
  process.exit(1)
})
