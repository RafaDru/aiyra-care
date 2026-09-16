/**
 * Massa QA — matriz família João/Maria/Francisco/Vitória (FAMILY_ACCESS_MODEL).
 *
 * Uso:
 *   $env:DATABASE_URL="postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare"
 *   node packages/api/scripts/seed-qa-family-matrix.mjs
 *   node packages/api/scripts/seed-qa-family-matrix.mjs --reset
 *
 * Vincular seu login Supabase a uma persona (teste manual):
 *   node packages/api/scripts/link-qa-persona.mjs --persona=joao --sub=<seu-supabase-uuid>
 */
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'
import {
  QA_JOAO_ACCOUNT_ID,
  QA_MARIA_ACCOUNT_ID,
  QA_FRANCISCO_ACCOUNT_ID,
  QA_VITORIA_ACCOUNT_ID,
  QA_JOAO_AUTH_SUBJECT,
  QA_MARIA_AUTH_SUBJECT,
  QA_FRANCISCO_AUTH_SUBJECT,
  QA_VITORIA_AUTH_SUBJECT,
  QA_PATIENT_PEDRO_ID,
  QA_PATIENT_LUCAS_ID,
  QA_PATIENT_MARIANA_ID,
  QA_PATIENT_HENRIQUE_ID,
  QA_CIRCLE_A_ID,
  QA_CIRCLE_B_ID,
} from './seed-qa-ids.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const reset = process.argv.includes('--reset')
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const QA_PATIENT_IDS = [
  QA_PATIENT_PEDRO_ID,
  QA_PATIENT_LUCAS_ID,
  QA_PATIENT_MARIANA_ID,
  QA_PATIENT_HENRIQUE_ID,
]

const QA_ACCOUNT_IDS = [
  QA_JOAO_ACCOUNT_ID,
  QA_MARIA_ACCOUNT_ID,
  QA_FRANCISCO_ACCOUNT_ID,
  QA_VITORIA_ACCOUNT_ID,
]

async function upsertAccount(client, { id, authSubject, email, displayName }) {
  await client.query(
    `INSERT INTO app_accounts (id, auth_provider, auth_subject, email, display_name)
     VALUES ($1, 'supabase', $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       display_name = EXCLUDED.display_name,
       updated_at = NOW()`,
    [id, authSubject, email, displayName],
  )
}

async function upsertPatient(client, { id, name, birthDate, ownerId, cpf, gender = 'male' }) {
  await client.query(
    `INSERT INTO patients (id, name, birth_date, gender, owner_account_id, cpf)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       birth_date = EXCLUDED.birth_date,
       gender = EXCLUDED.gender,
       owner_account_id = EXCLUDED.owner_account_id,
       cpf = EXCLUDED.cpf,
       updated_at = NOW()`,
    [id, name, birthDate, gender, ownerId, cpf],
  )
}

async function upsertGrant(client, patientId, accountId, grantedBy) {
  await client.query(
    `INSERT INTO patient_access_grants (patient_id, account_id, membership_role, access_level, granted_by)
     VALUES ($1, $2, 'guardian', 'full', $3)
     ON CONFLICT (patient_id, account_id)
     DO UPDATE SET revoked_at = NULL, access_level = 'full', updated_at = NOW()`,
    [patientId, accountId, grantedBy],
  )
  await client.query(
    `INSERT INTO patient_memberships (account_id, patient_id, role)
     VALUES ($1, $2, 'guardian')
     ON CONFLICT (account_id, patient_id) DO NOTHING`,
    [accountId, patientId],
  )
}

async function resetQa(client) {
  await client.query(`DELETE FROM patient_profile_share_invites WHERE owner_account_id = ANY($1::uuid[])`, [
    QA_ACCOUNT_IDS,
  ])
  await client.query(`DELETE FROM patients WHERE id = ANY($1::uuid[])`, [QA_PATIENT_IDS])
  for (const id of QA_ACCOUNT_IDS) {
    await client.query('DELETE FROM app_accounts WHERE id = $1', [id])
  }
  await client.query('DELETE FROM care_circles WHERE id = ANY($1::uuid[])', [[QA_CIRCLE_A_ID, QA_CIRCLE_B_ID]])
  console.log('qa-family-matrix: removed')
}

async function seed(client) {
  await upsertAccount(client, {
    id: QA_JOAO_ACCOUNT_ID,
    authSubject: QA_JOAO_AUTH_SUBJECT,
    email: 'qa-joao@aiyracare.local',
    displayName: 'João QA',
  })
  await upsertAccount(client, {
    id: QA_MARIA_ACCOUNT_ID,
    authSubject: QA_MARIA_AUTH_SUBJECT,
    email: 'qa-maria@aiyracare.local',
    displayName: 'Maria QA',
  })
  await upsertAccount(client, {
    id: QA_FRANCISCO_ACCOUNT_ID,
    authSubject: QA_FRANCISCO_AUTH_SUBJECT,
    email: 'qa-francisco@aiyracare.local',
    displayName: 'Francisco QA',
  })
  await upsertAccount(client, {
    id: QA_VITORIA_ACCOUNT_ID,
    authSubject: QA_VITORIA_AUTH_SUBJECT,
    email: 'qa-vitoria@aiyracare.local',
    displayName: 'Vitória QA',
  })

  await upsertPatient(client, {
    id: QA_PATIENT_PEDRO_ID,
    name: 'Pedro QA',
    birthDate: '2015-04-10',
    ownerId: QA_JOAO_ACCOUNT_ID,
    cpf: '10000000019',
  })
  await upsertPatient(client, {
    id: QA_PATIENT_LUCAS_ID,
    name: 'Lucas QA',
    birthDate: '2018-08-22',
    ownerId: QA_JOAO_ACCOUNT_ID,
    cpf: '10000000027',
  })
  await upsertPatient(client, {
    id: QA_PATIENT_MARIANA_ID,
    name: 'Mariana QA',
    birthDate: '2016-12-01',
    ownerId: QA_JOAO_ACCOUNT_ID,
    cpf: '10000000035',
    gender: 'female',
  })
  await upsertPatient(client, {
    id: QA_PATIENT_HENRIQUE_ID,
    name: 'Henrique QA',
    birthDate: '2019-06-15',
    ownerId: QA_FRANCISCO_ACCOUNT_ID,
    cpf: '10000000043',
  })

  await client.query(
    `INSERT INTO care_circles (id, name, billing_owner_account_id)
     VALUES ($1, 'Família A QA', $2), ($3, 'Família B QA', $4)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, billing_owner_account_id = EXCLUDED.billing_owner_account_id`,
    [QA_CIRCLE_A_ID, QA_JOAO_ACCOUNT_ID, QA_CIRCLE_B_ID, QA_FRANCISCO_ACCOUNT_ID],
  )

  const members = [
    [QA_CIRCLE_A_ID, QA_JOAO_ACCOUNT_ID, 'owner'],
    [QA_CIRCLE_A_ID, QA_MARIA_ACCOUNT_ID, 'admin'],
    [QA_CIRCLE_B_ID, QA_FRANCISCO_ACCOUNT_ID, 'owner'],
    [QA_CIRCLE_B_ID, QA_VITORIA_ACCOUNT_ID, 'admin'],
  ]
  for (const [circleId, accountId, role] of members) {
    await client.query(
      `INSERT INTO care_circle_members (circle_id, account_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (circle_id, account_id) DO UPDATE SET role = EXCLUDED.role`,
      [circleId, accountId, role],
    )
  }

  const circleLinks = [
    [QA_PATIENT_PEDRO_ID, QA_CIRCLE_A_ID, 'primary'],
    [QA_PATIENT_LUCAS_ID, QA_CIRCLE_A_ID, 'primary'],
    [QA_PATIENT_MARIANA_ID, QA_CIRCLE_A_ID, 'primary'],
    [QA_PATIENT_HENRIQUE_ID, QA_CIRCLE_B_ID, 'primary'],
    [QA_PATIENT_MARIANA_ID, QA_CIRCLE_B_ID, 'shared'],
  ]
  for (const [patientId, circleId, kind] of circleLinks) {
    await client.query(
      `INSERT INTO patient_circle_links (patient_id, circle_id, link_kind, linked_by_account_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (patient_id, circle_id) DO UPDATE SET link_kind = EXCLUDED.link_kind`,
      [
        patientId,
        circleId,
        kind,
        kind === 'shared' ? QA_JOAO_ACCOUNT_ID : null,
      ],
    )
  }

  // Grants — matriz de visibilidade
  for (const pid of [QA_PATIENT_PEDRO_ID, QA_PATIENT_LUCAS_ID, QA_PATIENT_MARIANA_ID]) {
    await upsertGrant(client, pid, QA_JOAO_ACCOUNT_ID, QA_JOAO_ACCOUNT_ID)
  }
  for (const pid of [QA_PATIENT_PEDRO_ID, QA_PATIENT_LUCAS_ID]) {
    await upsertGrant(client, pid, QA_MARIA_ACCOUNT_ID, QA_JOAO_ACCOUNT_ID)
  }
  await upsertGrant(client, QA_PATIENT_HENRIQUE_ID, QA_FRANCISCO_ACCOUNT_ID, QA_FRANCISCO_ACCOUNT_ID)
  await upsertGrant(client, QA_PATIENT_MARIANA_ID, QA_VITORIA_ACCOUNT_ID, QA_FRANCISCO_ACCOUNT_ID)

  console.log('qa-family-matrix seed OK')
  console.log('  Personas:', 'joao, maria, francisco, vitoria')
  console.log('  Link login: node packages/api/scripts/link-qa-persona.mjs --persona=joao --sub=<supabase-uuid>')
}

const client = await pool.connect()
try {
  if (reset) await resetQa(client)
  await seed(client)
} finally {
  client.release()
  await pool.end()
}
