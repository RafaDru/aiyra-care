import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from 'dotenv'
import { resolve, dirname, isAbsolute } from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../.env') })

if (process.env.LLM_QUOTA_UNLIMITED?.trim() === '1') {
  console.info('[llm] LLM_QUOTA_UNLIMITED=1 — franquia de IA desativada para todas as contas')
}

// .env usa GCP_SERVICE_ACCOUNT_KEY; @google-cloud/storage lê GOOGLE_APPLICATION_CREDENTIALS
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GCP_SERVICE_ACCOUNT_KEY) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GCP_SERVICE_ACCOUNT_KEY
}

// Relative GCP key in .env is resolved from monorepo root (API cwd is packages/api)
{
  const key = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (key && !isAbsolute(key)) {
    const fromRoot = resolve(__dirname, '../../../', key)
    if (existsSync(fromRoot)) process.env.GOOGLE_APPLICATION_CREDENTIALS = fromRoot
  }
}
import { createApiLoggerConfig } from './infrastructure/http/log-sanitization.js'

const app = Fastify({
  logger: createApiLoggerConfig(),
  rewriteUrl: (req) => req.url ?? '/',
})

app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  const url = req.url?.split('?')[0] ?? ''
  if (url === '/billing/webhook') {
    (req as { rawBody?: Buffer }).rawBody = body as Buffer
    done(null, body)
    return
  }
  try {
    const text = (body as Buffer).toString('utf8')
    done(null, text ? JSON.parse(text) : {})
  } catch (err) {
    done(err as Error, undefined)
  }
})

app.get('/health', async () => {
  return { status: 'ok', version: '0.1.0', service: 'aiyracare-api' }
})

app.get('/health/db', async () => {
  const results: Record<string, string> = {}

  try {
    const { pgPool } = await import('./db/postgres.js')
    const client = await pgPool.connect()
    const { rows } = await client.query('SELECT 1 AS connected')
    results.postgres = rows[0]?.connected === 1 ? 'ok' : 'error'
    client.release()
  } catch (e) {
    results.postgres = `error: ${(e as Error).message}`
  }

  try {
    const { neo4jDriver } = await import('./db/neo4j.js')
    await neo4jDriver.verifyConnectivity()
    const session = neo4jDriver.session()
    const result = await session.run('RETURN 1 AS connected')
    const val = result.records[0]?.get('connected')
    results.neo4j = val && val.toNumber() === 1 ? 'ok' : `unexpected: ${val}`
    await session.close()
  } catch (e) {
    results.neo4j = `fail: ${(e as Error).message}`
  }

  return results
})

async function registerRoutes() {
  const { registerLogSanitizationPlugin } = await import('./infrastructure/http/log-sanitization.plugin.js')
  await registerLogSanitizationPlugin(app)

  const { getAuthService } = await import('./infrastructure/http/auth/auth.routes.js')
  const { registerSecurityPlugin } = await import('./infrastructure/http/auth/security.plugin.js')
  const authService = getAuthService()
  await registerSecurityPlugin(app, authService)

  const { patientRoutes } = await import('./infrastructure/http/patient/patient.routes.js')
  const { growthRecordRoutes } = await import('./infrastructure/http/growth-record/growth-record.routes.js')
  const { vaccineRoutes } = await import('./infrastructure/http/vaccine/vaccine.routes.js')
  const { medicationRoutes } = await import('./infrastructure/http/medication/medication.routes.js')
  const { allergyRoutes } = await import('./infrastructure/http/allergy/allergy.routes.js')
  const { examRoutes } = await import('./infrastructure/http/exam/exam.routes.js')
  const { examOrderRoutes } = await import('./infrastructure/http/exam-order/exam-order.routes.js')
  const { hygieneRoutes } = await import('./infrastructure/http/hygiene/hygiene.routes.js')
  const { documentRoutes } = await import('./infrastructure/http/document/document.routes.js')
  const { handwritingCreditsRoutes } = await import('./infrastructure/http/handwriting/handwriting-credits.routes.js')
  const { medicalRecordRoutes } = await import('./infrastructure/http/medical-record/medical-record.routes.js')
  const { diagnosisRoutes } = await import('./infrastructure/http/diagnosis/diagnosis.routes.js')
  const { scraperRoutes } = await import('./infrastructure/http/scraper/scraper.routes.js')
  const { sessionsRoutes } = await import('./infrastructure/http/session/session.routes.js')
  const { integrationLinkRoutes } = await import('./infrastructure/http/integration-link/integration-link.routes.js')
  const { authorizationRoutes } = await import('./infrastructure/http/authorization/authorization.routes.js')
  const { insurancePlanRoutes } = await import('./infrastructure/http/insurance-plan/insurance-plan.routes.js')
  const { cadernetaImportRoutes } = await import('./infrastructure/http/caderneta/caderneta-import.routes.js')
  const { authRoutes } = await import('./infrastructure/http/auth/auth.routes.js')
  const { carePlaceRoutes } = await import('./infrastructure/http/care-place/care-place.routes.js')
  const { healthThreadRoutes } = await import('./infrastructure/http/health-thread/health-thread.routes.js')
  const { clinicalLinkRoutes } = await import('./infrastructure/http/clinical-link/clinical-link.routes.js')
  const { roadmapRoutes } = await import('./infrastructure/http/roadmap/roadmap.routes.js')
  const { projectContextRoutes } = await import('./infrastructure/http/project/project-context.routes.js')

  const { graphRoutes } = await import('./infrastructure/http/graph/graph.routes.js')
  const { clinicalExportRoutes } = await import('./infrastructure/http/clinical-export/clinical-export.routes.js')
  const { scheduledEventRoutes } = await import('./infrastructure/http/scheduled-event/scheduled-event.routes.js')
  const { billingRoutes } = await import('./infrastructure/http/billing/billing.routes.js')
  const { legalComplianceRoutes } = await import('./infrastructure/http/legal-compliance/legal-compliance.routes.js')
  const { googleCalendarRoutes } = await import('./infrastructure/http/calendar/google-calendar.routes.js')
  const { microsoftCalendarRoutes } = await import('./infrastructure/http/calendar/microsoft-calendar.routes.js')
  const { measurementRoutes } = await import('./infrastructure/http/measurement/measurement.routes.js')
  const { careReminderRoutes } = await import('./infrastructure/http/care-reminder/care-reminder.routes.js')
  const { examResultItemRoutes } = await import('./infrastructure/http/exam-result-item/exam-result-item.routes.js')

  await app.register(patientRoutes)
  const { familySupportRoutes } = await import('./infrastructure/http/family-support/family-support.routes.js')
  await app.register(familySupportRoutes)
  const { avaRoutes } = await import('./infrastructure/http/ava/ava.routes.js')
  await app.register(avaRoutes)
  const { telemetryRoutes } = await import('./infrastructure/http/telemetry/telemetry.routes.js')
  await app.register(telemetryRoutes)
  const { opsRoutes } = await import('./infrastructure/http/ops/ops.routes.js')
  await app.register(opsRoutes)
  const { emergencyRoutes } = await import('./infrastructure/http/emergency/emergency.routes.js')
  await app.register(emergencyRoutes)
  await app.register(growthRecordRoutes)
  await app.register(vaccineRoutes)
  await app.register(medicationRoutes)
  await app.register(allergyRoutes)
  await app.register(examRoutes)
  await app.register(hygieneRoutes)
  await app.register(examOrderRoutes)
  await app.register(documentRoutes)
  await app.register(handwritingCreditsRoutes)
  await app.register(medicalRecordRoutes)
  await app.register(diagnosisRoutes)
  await app.register(scraperRoutes)
  await app.register(sessionsRoutes)
  await app.register(integrationLinkRoutes)
  await app.register(authorizationRoutes)
  await app.register(insurancePlanRoutes)
  await app.register(cadernetaImportRoutes)
  await app.register(authRoutes)
  const { accountProfileRoutes } = await import('./infrastructure/http/account-profile/account-profile.routes.js')
  await app.register(accountProfileRoutes)
  await app.register(carePlaceRoutes)
  await app.register(healthThreadRoutes)
  await app.register(clinicalLinkRoutes)
  await app.register(graphRoutes)
  await app.register(clinicalExportRoutes)
  await app.register(scheduledEventRoutes)
  await app.register(billingRoutes)
  await app.register(legalComplianceRoutes)
  await app.register(googleCalendarRoutes)
  await app.register(microsoftCalendarRoutes)
  await app.register(measurementRoutes)
  await app.register(careReminderRoutes)
  await app.register(examResultItemRoutes)
  await app.register(roadmapRoutes)
  await app.register(projectContextRoutes)
}

const start = async () => {
  try {
    await app.register(cors, { origin: true, methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] })
    await registerRoutes()

    const scheduledIntervalMs = Number(process.env.SYNC_SCHEDULED_INTERVAL_MS ?? '0')
    const workerExternal = process.env.CONNECT_WORKER_EXTERNAL === '1'
    if (scheduledIntervalMs > 0 && !workerExternal) {
      const { pgPool } = await import('./db/postgres.js')
      const { startScheduledSyncLoop } = await import('./infrastructure/sync/scheduled-sync.loop.js')
      startScheduledSyncLoop(pgPool, scheduledIntervalMs, app.log)
    } else if (scheduledIntervalMs > 0 && workerExternal) {
      app.log.info('SYNC_SCHEDULED_INTERVAL_MS ignored — CONNECT_WORKER_EXTERNAL=1 (use packages/connect-worker)')
    }

    await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
