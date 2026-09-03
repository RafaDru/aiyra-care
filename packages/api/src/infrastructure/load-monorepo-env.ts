import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'

/** Carrega `.env` + `.env.preview` (override) quando Ambiente 2. */
export function loadMonorepoEnv(monorepoRoot: string): void {
  config({ path: resolve(monorepoRoot, '.env') })
  const previewPath = resolve(monorepoRoot, '.env.preview')
  const isPreview =
    process.env.DEPLOYMENT_TIER === 'preview'
    || process.env.PORT === '3020'
    || process.env.OPS_CONSOLE_PORT === '3023'
  if (isPreview && existsSync(previewPath)) {
    config({ path: previewPath, override: true })
  }
}
