import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'
import { createPatientFromDashboard, openPatientByName } from '../helpers/patient'
import { emulateCompactAppShell } from '../helpers/compact-shell'
import { openAvaDock } from '../helpers/ava'

test.describe('pwa-mobile-patient-ux', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    requireQaTestCredentials()
    await emulateCompactAppShell(page)
  })

  test('dia a dia aparece apos cadastro sem reload (X1)', async ({ page }) => {
    await ensureQaE2eSession(page)
    await page.goto('/')

    const unique = `QA UX ${Date.now()}`
    await createPatientFromDashboard(page, {
      name: unique,
      birthDate: '10/05/2019',
      genderLabel: 'Feminino',
    })

    await expect(page.getByText(unique)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('day-to-day-discovery-hub')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.wallet-today-panel')).toBeVisible({ timeout: 15_000 })
  })

  test('sub-abas compact em perfil (X4)', async ({ page }) => {
    await ensureQaE2eSession(page)
    await page.goto('/')

    const unique = `QA SubTab ${Date.now()}`
    await createPatientFromDashboard(page, {
      name: unique,
      birthDate: '15/08/2015',
      genderLabel: 'Masculino',
    })
    await openPatientByName(page, unique)

    await page.getByTestId('patient-macro-sections-compact').getByRole('tab', { name: 'Histórico clínico' }).click()
    const compact = page.getByTestId('patient-sub-tabs-compact')
    await expect(compact).toBeVisible({ timeout: 15_000 })
    await expect(compact.getByRole('tab', { name: 'Vacinas' })).toBeVisible()
    await expect(compact.getByRole('tab', { name: 'Medicações' })).toBeVisible()
    await page.getByTestId('patient-sub-tabs-menu').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Consultas', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('PAT-2a macro icone-top + PAT-CTX-1 barra pessoa ao rolar', async ({ page }) => {
    await ensureQaE2eSession(page)
    await page.goto('/')

    const unique = `QA MacroCtx ${Date.now()}`
    await createPatientFromDashboard(page, {
      name: unique,
      birthDate: '20/03/2018',
      genderLabel: 'Feminino',
    })
    await openPatientByName(page, unique)

    const firstTile = page.getByTestId('patient-macro-sections-compact').getByRole('tab').first()
    const iconBox = await firstTile.locator('.patient-macro-tile__icon').boundingBox()
    const labelBox = await firstTile.locator('.patient-macro-tile__label').boundingBox()
    expect(iconBox).not.toBeNull()
    expect(labelBox).not.toBeNull()
    expect(iconBox!.y).toBeLessThan(labelBox!.y)

    const ctxSlot = page.getByTestId('app-header-patient-ctx-slot')
    await expect(ctxSlot.getByRole('button')).toHaveCount(0)
    await page.locator('.app-main-content').evaluate((el) => {
      el.scrollTop = 420
    })
    await expect(ctxSlot.getByRole('button')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.app-layout--patient-chrome')).toBeVisible()
    await ctxSlot.getByRole('button').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(unique, { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('drawer Neri ocupa largura total no compact (P0-6)', async ({ page }) => {
    await ensureQaE2eSession(page)
    await page.goto('/')
    await openAvaDock(page)
    const drawer = page.locator('.ava-chat-drawer--compact .ant-drawer-content-wrapper')
    await expect(drawer).toBeVisible({ timeout: 15_000 })
    const box = await drawer.boundingBox()
    expect(box).not.toBeNull()
    const viewport = page.viewportSize()
    expect(viewport).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual((viewport!.width ?? 390) * 0.98)
  })
})