import { execSync } from 'child_process'
import { resolve } from 'path'
import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'
import { gotoFamilySettings } from '../helpers/navigation'

const repoRoot = resolve(process.cwd(), '..', '..')

test.describe('family-access-matrix', () => {
  test.beforeAll(() => {
    execSync('npm run seed:qa-family-matrix', { cwd: repoRoot, stdio: 'inherit' })
    execSync('npm run qa:verify-family-matrix', { cwd: repoRoot, stdio: 'inherit' })
  })

  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('tela Família carrega com círculos de cuidado', async ({ page }) => {
    await ensureQaE2eSession(page)
    await gotoFamilySettings(page)

    await expect(page.getByRole('heading', { name: /Famílias/ }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Nova família' })).toBeVisible()
  })
})
