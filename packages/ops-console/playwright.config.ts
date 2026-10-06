import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from '@playwright/test'

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)))

export default defineConfig({
  testDir: resolve(pkgRoot, 'e2e'),
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4313',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4313',
    cwd: pkgRoot,
    url: 'http://127.0.0.1:4313',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
