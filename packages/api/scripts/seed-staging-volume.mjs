/**
 * Volume sintético para staging «shape produtivo» — sync_jobs, product_events, llm_usage.
 * Requer seed-demo-data antes. Marca registros com STAGING_VOLUME_MARKER.
 *
 *   node scripts/seed-staging-volume.mjs
 *   node scripts/seed-staging-volume.mjs --reset
 */
import { randomUUID } from 'crypto'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'
import {
  DEMO_ACCOUNT_ID,
  PATIENT_LUCAS_ID,
  PATIENT_ANA_ID,
  LINK_UNIMED_LUCAS,
  LINK_AMIL_ANA,
  STAGING_VOLUME_MARKER,
} from './seed-demo-ids.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const reset = process.argv.includes('--reset')
const syncCount = Number(process.env.STAGING_SEED_SYNC_JOBS ?? 40)
const eventCount = Number(process.env.STAGING_SEED_EVENTS ?? 150)
const llmCount = Number(process.env.STAGING_SEED_LLM_EVENTS ?? 30)

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const links = [
  { id: LINK_UNIMED_LUCAS, portal: 'unimed_bh', patientId: PATIENT_LUCAS_ID },
  { id: LINK_AMIL_ANA, portal: 'amil', patientId: PATIENT_ANA_ID },
]

async function clearVolume(client) {
  await client.query(
    `DELETE FROM sync_jobs WHERE step_details->>'seed' = $1`,
    [STAGING_VOLUME_MARKER],
  )
  await client.query(
    `DELETE FROM product_events WHERE properties->>'seed' = $1`,
    [STAGING_VOLUME_MARKER],
  )
  await client.query(
    `DELETE FROM llm_usage_events WHERE metadata->>'seed' = $1`,
    [STAGING_VOLUME_MARKER],
  )
  console.log('staging volume cleared')
}

async function seedVolume(client) {
  const now = Date.now()
  const statuses = ['success', 'success', 'success', 'failed']
  const failureKinds = ['session_expired', 'timeout', 'unknown']

  for (let i = 0; i < syncCount; i++) {
    const link = links[i % links.length]
    const status = statuses[i % statuses.length]
    const started = new Date(now - (i + 1) * 3600 * 1000)
    const finished = new Date(started.getTime() + (60 + (i % 120)) * 1000)
    const failureKind =
      status === 'failed' ? failureKinds[i % failureKinds.length] : null

    await client.query(
      `INSERT INTO sync_jobs (
         id, integration_link_id, portal_type, trigger, status, step, message,
         step_details, result, error, failure_kind, started_at, finished_at
       ) VALUES ($1, $2, $3, $4, $5, 'done', $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12)`,
      [
        randomUUID(),
        link.id,
        link.portal,
        i % 5 === 0 ? 'scheduled' : 'manual',
        status,
        status === 'failed' ? 'Falha sintética staging' : 'Sync sintético OK',
        JSON.stringify({ seed: STAGING_VOLUME_MARKER, index: i }),
        JSON.stringify({
          seed: STAGING_VOLUME_MARKER,
          imported: { exams: i % 3, authorizations: i % 2 },
        }),
        status === 'failed' ? 'synthetic error' : null,
        failureKind,
        started,
        finished,
      ],
    )
  }

  const routes = ['wallet', 'integrations', 'exams', 'ava_chat', 'settings/plan']
  const events = ['page_view', 'sync_started', 'sync_completed', 'ava_message_sent', 'export_clinical']

  for (let i = 0; i < eventCount; i++) {
    const patientId = i % 2 === 0 ? PATIENT_LUCAS_ID : PATIENT_ANA_ID
    const created = new Date(now - (i + 1) * 600 * 1000)
    await client.query(
      `INSERT INTO product_events (account_id, event_name, route, patient_id, properties, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        DEMO_ACCOUNT_ID,
        events[i % events.length],
        routes[i % routes.length],
        patientId,
        JSON.stringify({ seed: STAGING_VOLUME_MARKER, i }),
        created,
      ],
    )
  }

  for (let i = 0; i < llmCount; i++) {
    const patientId = i % 2 === 0 ? PATIENT_LUCAS_ID : PATIENT_ANA_ID
    const created = new Date(now - (i + 1) * 7200 * 1000)
    await client.query(
      `INSERT INTO llm_usage_events (
         scope_id, account_id, feature, patient_id, provider, model, tier,
         tokens_in, tokens_out, tokens_total, usage_source, estimated_cost_cents, metadata, created_at
       ) VALUES ($1, $2, 'ava_chat', $3, 'gemini', 'gemini-2.5-flash', 'free',
         $4, $5, $6, 'estimated', $7, $8::jsonb, $9)`,
      [
        DEMO_ACCOUNT_ID,
        DEMO_ACCOUNT_ID,
        patientId,
        200 + (i % 50),
        80 + (i % 30),
        280 + (i % 80),
        i % 10,
        JSON.stringify({ seed: STAGING_VOLUME_MARKER, i }),
        created,
      ],
    )
  }

  console.log(`staging volume OK: ${syncCount} sync_jobs, ${eventCount} product_events, ${llmCount} llm_usage`)
}

const client = await pool.connect()
try {
  await client.query('BEGIN')
  if (reset) await clearVolume(client)
  await seedVolume(client)
  await client.query('COMMIT')
} catch (e) {
  await client.query('ROLLBACK')
  console.error(e)
  process.exit(1)
} finally {
  client.release()
  await pool.end()
}
