/**
 * Notebook repair: Luis account (luisdrummond…) already has patient row (CPF 18245784664)
 * under Rafael's guardian membership — link self profile instead of re-creating via onboarding.
 */
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const luisAccountId = '92a9d870-b405-4497-9097-bb245f0f3c7a'
const luisPatientId = 'c63446cf-9277-4e53-8006-a12ecafddfad'

const client = await pool.connect()
try {
  await client.query('BEGIN')
  await client.query(
    `UPDATE patients SET owner_account_id = $1, updated_at = NOW() WHERE id = $2`,
    [luisAccountId, luisPatientId],
  )
  await client.query(
    `UPDATE patient_memberships SET role = 'guardian' WHERE account_id = $1 AND role = 'self'`,
    [luisAccountId],
  )
  await client.query(
    `INSERT INTO patient_memberships (account_id, patient_id, role)
     VALUES ($1, $2, 'self')
     ON CONFLICT (account_id, patient_id) DO UPDATE SET role = 'self'`,
    [luisAccountId, luisPatientId],
  )
  await client.query('COMMIT')
  console.log('OK: self profile linked for Luis account')
} catch (err) {
  await client.query('ROLLBACK')
  console.error(err)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
