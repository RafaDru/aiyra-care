import dotenv from 'dotenv'
import path from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { isAbsolute, resolve } from 'path'
import pg from 'pg'

export function loadMonorepoEnv(): string {
  const root = resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
  const envPath = path.join(root, '.env')
  dotenv.config({ path: envPath })

  const previewPath = path.join(root, '.env.preview')
  const tier = process.env.DEPLOYMENT_TIER?.trim().toLowerCase()
  const dbUrl = process.env.DATABASE_URL ?? ''
  if (
    existsSync(previewPath) &&
    (tier === 'preview' || dbUrl.includes('aiyracare_preview') || process.env.PORT === '3020')
  ) {
    dotenv.config({ path: previewPath, override: true })
  }

  const key = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (key && !isAbsolute(key)) {
    const fromRoot = resolve(root, key)
    if (existsSync(fromRoot)) process.env.GOOGLE_APPLICATION_CREDENTIALS = fromRoot
  }

  return root
}

export function createWorkerPool(): pg.Pool {
  return new pg.Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
  })
}
