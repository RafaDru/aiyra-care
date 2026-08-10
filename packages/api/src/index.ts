import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from 'dotenv'
import { resolve, dirname, isAbsolute } from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../.env') })

// Relative GCP key in .env is resolved from monorepo root (API cwd is packages/api)
{
  const key = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (key && !isAbsolute(key)) {
    const fromRoot = resolve(__dirname, '../../../', key)
    if (existsSync(fromRoot)) process.env.GOOGLE_APPLICATION_CREDENTIALS = fromRoot
  }
}
const app = Fastify({ logger: true })

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

  await app.register(patientRoutes)
  await app.register(growthRecordRoutes)
  await app.register(vaccineRoutes)
  await app.register(medicationRoutes)
  await app.register(allergyRoutes)
  await app.register(examRoutes)
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
  await app.register(carePlaceRoutes)
  await app.register(healthThreadRoutes)
  await app.register(clinicalLinkRoutes)
  await app.register(roadmapRoutes)
  await app.register(projectContextRoutes)
}

const start = async () => {
  try {
    await app.register(cors, { origin: true, methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] })
    await registerRoutes()
    await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
