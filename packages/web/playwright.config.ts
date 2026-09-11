import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from '@playwright/test'

const webRoot = resolve(process.cwd())

function loadDotEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  const env: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0) continue
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  }
  return env
}

const e2eEnv = loadDotEnvFile(resolve(webRoot, '.env.e2e.local'))
const webServerEnv = {
  ...process.env,
  VITE_API_URL: process.env.VITE_API_URL ?? e2eEnv.VITE_API_URL ?? 'http://127.0.0.1:3010',
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? e2eEnv.VITE_SUPABASE_URL ?? '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? e2eEnv.VITE_SUPABASE_ANON_KEY ?? '',
}

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 90_000,
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  projects: process.env.CI
    ? [
        { name: 'smoke', testMatch: /e2e\/smoke\.spec\.ts$/ },
        {
          name: 'e2e',
          testMatch: /e2e\/.*\.spec\.ts$/,
          testIgnore: /e2e\/smoke\.spec\.ts$/,
          dependencies: ['smoke'],
        },
      ]
    : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: webServerEnv,
  },
})
