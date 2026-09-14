import { expect, type Page } from '@playwright/test'

async function waitAvaComposerReady(page: Page, timeout = 90_000) {
  const send = page.getByRole('button', { name: 'Enviar' })
  await send.waitFor({ state: 'visible', timeout })
  await expect(send).not.toHaveClass(/ant-btn-loading/, { timeout })
  await expect(send).toBeEnabled({ timeout })
}

export async function openAvaDock(page: Page) {
  await page.getByRole('button', { name: 'Abrir conversa com Ava' }).click({ force: true })
  await page.getByPlaceholder(/febre|Ex\.:/i).waitFor({ state: 'visible', timeout: 30_000 })
  await waitAvaComposerReady(page)
}

/** Aguarda texto na última bolha da Ava (SSE pode atrasar no CI). */
export async function waitForAvaAssistantReply(
  page: Page,
  pattern: RegExp,
  timeout = 90_000,
) {
  const bubble = page.locator('.ava-chat-bubble-row--ava').last()
  await expect(bubble).toBeVisible({ timeout })
  await expect(bubble).not.toHaveText(/^\s*$/, { timeout })
  await expect(bubble).toContainText(pattern, { timeout })
  return bubble
}

export async function sendAvaMessage(page: Page, text: string) {
  await waitAvaComposerReady(page)
  const avaBubblesBefore = await page.locator('.ava-chat-bubble-row--ava').count()

  const input = page.getByPlaceholder(/febre|Ex\.:/i)
  await input.fill(text)
  await page.getByRole('button', { name: 'Enviar' }).click()

  await expect(page.locator('.ava-chat-bubble-row--ava')).toHaveCount(avaBubblesBefore + 1, {
    timeout: 45_000,
  })
  await waitForAvaAssistantReply(page, /\S/, 90_000)
  await waitAvaComposerReady(page)
}

export async function waitForAvaAssistantBubble(page: Page, timeout = 45_000) {
  const bubble = page.locator('.ava-chat-bubble-row--ava').last()
  await bubble.waitFor({ state: 'visible', timeout })
  return bubble
}
