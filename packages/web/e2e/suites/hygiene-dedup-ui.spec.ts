import { execSync } from 'child_process'
import { resolve } from 'path'
import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'

const repoRoot = resolve(process.cwd(), '..', '..')

test.describe('hygiene-dedup-ui', () => {
  test.beforeEach(async ({ page }) => {
    requireQaTestCredentials()
    execSync('npm run qa:seed-hygiene-candidate -- --reset', { cwd: repoRoot, stdio: 'ignore' })
    await page.addInitScript(() => {
      localStorage.removeItem('aiyracare:hygiene-prompt-snoozed-until')
    })
  })

  test('resolver duplicata como registros distintos', async ({ page }) => {
    await ensureQaE2eSession(page, { keepHygienePrompt: true })
    await page.reload()
    await page.waitForLoadState('networkidle')

    const modal = page.getByRole('dialog', { name: 'Registros parecidos no prontuário' })
    await modal.waitFor({ state: 'visible', timeout: 25_000 })
    await modal.getByRole('button', { name: 'Registros distintos' }).click()
    await modal.waitFor({ state: 'hidden', timeout: 15_000 })
  })
})
