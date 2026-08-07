import { pgPool } from '../src/db/postgres.ts'

const r = await pgPool.query('SELECT code, label FROM relation_types ORDER BY code')
console.log('relation_types:', r.rows.length, r.rows.map((x) => x.code).join(', '))
const t = await pgPool.query('SELECT COUNT(*)::int AS n FROM clinical_entity_links')
console.log('clinical_entity_links:', t.rows[0].n)
await pgPool.end()
