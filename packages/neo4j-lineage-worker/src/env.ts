import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { resolve } from 'path'
import pg from 'pg'

export function loadMonorepoEnv(): string {
  const root = resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
  dotenv.config({ path: path.join(root, '.env') })
  return root
}

export function createWorkerPool(): pg.Pool {
  return new pg.Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
  })
}
