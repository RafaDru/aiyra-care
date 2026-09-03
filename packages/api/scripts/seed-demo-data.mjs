/**
 * Massa de demonstração LGPD-safe — conta demo + 2 pacientes pediátricos.
 *
 * Uso:
 *   node scripts/seed-demo-data.mjs
 *   node scripts/seed-demo-data.mjs --reset
 *
 * Requer: DATABASE_URL. CRYPTO_KEY opcional (sessão mock nos integration_links).
 */
import { createCipheriv, randomBytes } from 'crypto'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

import {
  DEMO_ACCOUNT_ID,
  DEMO_AUTH_SUBJECT,
  PATIENT_LUCAS_ID,
  PATIENT_ANA_ID,
  LINK_UNIMED_LUCAS,
  LINK_AMIL_ANA,
} from './seed-demo-ids.mjs'

const reset = process.argv.includes('--reset')

function encryptOptional(text) {
  const hex = process.env.CRYPTO_KEY
  if (!hex) return null
  const key = Buffer.from(hex, 'hex')
  if (key.length !== 32) {
    console.warn('CRYPTO_KEY inválida — integration_links sem sessão mock')
    return null
  }
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted.toString('hex')
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function resetDemo(client) {
  await client.query('DELETE FROM patients WHERE id = ANY($1::uuid[])', [[PATIENT_LUCAS_ID, PATIENT_ANA_ID]])
  await client.query('DELETE FROM app_accounts WHERE id = $1', [DEMO_ACCOUNT_ID])
  console.log('demo data removed')
}

async function seed(client) {
  const sessionToken = encryptOptional('demo-session-token-not-real')
  const sessionExpires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

  await client.query(
    `INSERT INTO app_accounts (id, auth_provider, auth_subject, email, display_name)
     VALUES ($1, 'supabase', $2, 'demo-familia@aiyracare.local', 'Família Demo')
     ON CONFLICT (auth_provider, auth_subject) DO UPDATE SET
       email = EXCLUDED.email,
       display_name = EXCLUDED.display_name,
       updated_at = NOW()`,
    [DEMO_ACCOUNT_ID, DEMO_AUTH_SUBJECT],
  )

  for (const row of [
    {
      id: PATIENT_LUCAS_ID,
      name: 'Lucas Demo Silva',
      birth_date: '2020-03-15',
      gender: 'male',
      blood_type: 'O+',
      cpf: '52998224725',
      cns: '898001160660003',
      weight: 18.5,
      height: 112,
    },
    {
      id: PATIENT_ANA_ID,
      name: 'Ana Demo Silva',
      birth_date: '2022-07-20',
      gender: 'female',
      blood_type: 'A+',
      cpf: '39053344705',
      cns: '898001160660004',
      weight: 14.2,
      height: 98,
    },
  ]) {
    await client.query(
      `INSERT INTO patients (id, name, birth_date, gender, blood_type, weight_kg, height_cm, cpf, cns, owner_account_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         birth_date = EXCLUDED.birth_date,
         gender = EXCLUDED.gender,
         blood_type = EXCLUDED.blood_type,
         weight_kg = EXCLUDED.weight_kg,
         height_cm = EXCLUDED.height_cm,
         cpf = EXCLUDED.cpf,
         cns = EXCLUDED.cns,
         owner_account_id = EXCLUDED.owner_account_id,
         updated_at = NOW()`,
      [
        row.id,
        row.name,
        row.birth_date,
        row.gender,
        row.blood_type,
        row.weight,
        row.height,
        row.cpf,
        row.cns,
        DEMO_ACCOUNT_ID,
      ],
    )
    await client.query(
      `INSERT INTO patient_memberships (account_id, patient_id, role)
       VALUES ($1, $2, 'guardian')
       ON CONFLICT (account_id, patient_id) DO NOTHING`,
      [DEMO_ACCOUNT_ID, row.id],
    )
  }

  await client.query(
    `INSERT INTO integration_links (
       id, patient_id, portal_type, email, encrypted_session_token, session_expires_at,
       active, last_sync_at, auth_attention
     ) VALUES ($1, $2, 'unimed_bh', 'demo@unimed.local', $3, $4, true, NOW(), 'none')
     ON CONFLICT (patient_id, portal_type) DO UPDATE SET
       encrypted_session_token = EXCLUDED.encrypted_session_token,
       session_expires_at = EXCLUDED.session_expires_at,
       active = true,
       last_sync_at = NOW(),
       auth_attention = 'none',
       updated_at = NOW()`,
    [LINK_UNIMED_LUCAS, PATIENT_LUCAS_ID, sessionToken, sessionExpires],
  )

  await client.query(
    `INSERT INTO integration_links (
       id, patient_id, portal_type, email, encrypted_session_token, session_expires_at,
       active, last_sync_at, auth_attention
     ) VALUES ($1, $2, 'amil', 'demo@amil.local', $3, $4, true, NOW(), 'none')
     ON CONFLICT (patient_id, portal_type) DO UPDATE SET
       encrypted_session_token = EXCLUDED.encrypted_session_token,
       session_expires_at = EXCLUDED.session_expires_at,
       active = true,
       last_sync_at = NOW(),
       auth_attention = 'none',
       updated_at = NOW()`,
    [LINK_AMIL_ANA, PATIENT_ANA_ID, sessionToken, sessionExpires],
  )

  const today = new Date()
  const iso = (d) => d.toISOString().slice(0, 10)
  const daysAgo = (n) => {
    const d = new Date(today)
    d.setDate(d.getDate() - n)
    return iso(d)
  }

  await client.query(
    `INSERT INTO medical_records (patient_id, record_date, record_type, description, doctor_name, specialty, clinic_name, source)
     VALUES ($1, $2, 'consultation', 'Consulta pediátrica de rotina — demo', 'Dra. Helena Demo', 'Pediatria', 'Clínica Infantil Demo', 'manual')`,
    [PATIENT_LUCAS_ID, daysAgo(30)],
  )

  await client.query(
    `INSERT INTO exams (patient_id, exam_type, exam_date, result_summary, laboratory, source)
     VALUES ($1, 'Hemograma completo', $2, 'Resultado dentro dos parâmetros — dado sintético', 'Lab Demo', 'manual')`,
    [PATIENT_LUCAS_ID, daysAgo(14)],
  )

  await client.query(
    `INSERT INTO vaccines (patient_id, vaccine_name, dose_number, application_date, clinic, source)
     VALUES ($1, 'Tríplice viral', 1, $2, 'UBS Demo', 'manual')`,
    [PATIENT_ANA_ID, daysAgo(180)],
  )

  await client.query(
    `INSERT INTO authorizations (
       id, patient_id, procedure_description, doctor_name, clinic_name,
       authorization_date, validity_date, status, guide_number, source
     ) VALUES (
       uuid_generate_v4(), $1, 'Consulta pediatria — demo', 'Dra. Helena Demo', 'Clínica Infantil Demo',
       $2, $3, 'authorized', 'GUIA-DEMO-001', 'manual'
     )`,
    [PATIENT_ANA_ID, daysAgo(7), daysAgo(-30)],
  )

  await client.query(
    `INSERT INTO medications (patient_id, generic_name, brand_name, dosage, frequency, start_date, is_active)
     VALUES ($1, 'Paracetamol', 'Tylenol Baby', '200mg', 'se necessário', $2, true)`,
    [PATIENT_LUCAS_ID, daysAgo(5)],
  )

  console.log('demo seed OK')
  console.log('  account_id:', DEMO_ACCOUNT_ID)
  console.log('  auth_subject (Supabase link manual):', DEMO_AUTH_SUBJECT)
  console.log('  patients:', PATIENT_LUCAS_ID, PATIENT_ANA_ID)
  if (!sessionToken) console.warn('  CRYPTO_KEY absent — integration_links without session (silent sync off)')
}

const client = await pool.connect()
try {
  await client.query('BEGIN')
  if (reset) await resetDemo(client)
  await seed(client)
  await client.query('COMMIT')
} catch (e) {
  await client.query('ROLLBACK')
  console.error(e)
  process.exit(1)
} finally {
  client.release()
  await pool.end()
}
