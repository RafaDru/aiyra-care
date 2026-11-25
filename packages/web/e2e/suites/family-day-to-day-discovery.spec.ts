import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'

test.describe('family-day-to-day-discovery', () => {
  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('guia discovery no dashboard abre captura e consulta', async ({ page }) => {
    await ensureQaE2eSession(page)
    await page.addInitScript(() => {
      const key = 'aiyracare.dismissedHints'
      const raw = localStorage.getItem(key)
      if (!raw) return
      try {
        const list = JSON.parse(raw) as string[]
        const next = list.filter((id) => id !== 'day-to-day-discovery-hub')
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        /* ignore */
      }
    })
    await page.goto('/')
    await page.reload()

    const hub = page.getByTestId('day-to-day-discovery-hub')
    await expect(hub.getByText('Dia a dia da família')).toBeVisible({ timeout: 20_000 })

    await hub.getByRole('button', { name: 'Registrar agora' }).click()
    const capture = page.getByRole('dialog', { name: 'Registro rápido' })
    await capture.waitFor({ state: 'visible' })
    await capture.getByRole('button', { name: 'Cancelar' }).click()
    await capture.waitFor({ state: 'hidden' })

    await hub.getByRole('button', { name: /Preparar consulta/ }).click()
    const consult = page.getByRole('dialog', { name: 'Levar na consulta' })
    await consult.waitFor({ state: 'visible' })
    await consult.getByRole('button', { name: 'Fechar' }).click()

    await hub.getByRole('button', { name: 'Fechar guia' }).click()
    await expect(hub).toBeHidden()

    await page.reload()
    await expect(hub).toBeHidden()
  })

  test('hub legivel em dark mode (P0-8)', async ({ page }) => {
    await ensureQaE2eSession(page)
    await page.addInitScript(() => {
      localStorage.setItem('aiyracare-dark-mode', '1')
      const key = 'aiyracare.dismissedHints'
      const raw = localStorage.getItem(key)
      try {
        const list = raw ? (JSON.parse(raw) as string[]) : []
        const next = list.filter((id) => id !== 'day-to-day-discovery-hub')
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        /* ignore */
      }
    })
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    const hub = page.getByTestId('day-to-day-discovery-hub')
    await expect(hub.getByText('Dia a dia da família')).toBeVisible({ timeout: 20_000 })
    const bg = await hub.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).not.toContain('255, 255, 255')
  })
})
