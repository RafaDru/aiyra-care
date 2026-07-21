import { Pool } from 'pg'

export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
})

pgPool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err)
})
