import type { Page } from '@playwright/test'

/** FAB da Ava cobre botões no canto inferior — esconder em E2E clínico. */
export async function hideAvaDock(page: Page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('.ava-global-dock')) {
      ;(el as HTMLElement).style.display = 'none'
    }
  })
}

/** Banner/modal de higienização bloqueia dashboard — adiar exceto no spec dedicado. */
export async function dismissHygienePrompt(page: Page) {
  const bannerLater = page.getByRole('alert').filter({ hasText: /duplicatas pendentes/i }).getByRole('button', { name: 'Depois' })
  if (await bannerLater.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await bannerLater.click()
    return
  }
  const modal = page.getByRole('dialog', { name: 'Registros parecidos no prontuário' })
  if (await modal.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await modal.getByRole('button', { name: 'Depois' }).click()
  }
}
