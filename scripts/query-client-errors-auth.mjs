#!/usr/bin/env node
import pg from 'pg'

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const { rows } = await pool.query(
  `SELECT created_at, feature, error_code, route, properties
   FROM client_errors
   WHERE created_at > NOW() - INTERVAL '7 days'
     AND (
       route ILIKE '%auth%'
       OR properties::text ILIKE '%google%'
       OR properties::text ILIKE '%oauth%'
       OR error_code ILIKE '%google%'
       OR error_code ILIKE '%oauth%'
     )
   ORDER BY created_at DESC
   LIMIT 20`,
)
console.log(JSON.stringify(rows, null, 2))
await pool.end()
