import { expect, type Page } from '@playwright/test'

export async function openAvaDock(page: Page) {
  await page.getByRole('button', { name: 'Abrir conversa com Ava' }).click({ force: true })
  await page.getByPlaceholder(/febre|Ex\.:/i).waitFor({ state: 'visible', timeout: 20_000 })
}

export async function sendAvaMessage(page: Page, text: string) {
  const input = page.getByPlaceholder(/febre|Ex\.:/i)
  await input.fill(text)
  await page.getByRole('button', { name: 'Enviar' }).click()
}

export async function waitForAvaAssistantBubble(page: Page, timeout = 45_000) {
  const bubble = page.locator('.ava-chat-bubble-row--ava').last()
  await bubble.waitFor({ state: 'visible', timeout })
  return bubble
}

/** Aguarda texto na última bolha da Ava (SSE pode atrasar no CI). */
export async function waitForAvaAssistantReply(
  page: Page,
  pattern: RegExp,
  timeout = 60_000,
) {
  const bubble = page.locator('.ava-chat-bubble-row--ava').last()
  await expect(bubble).toContainText(pattern, { timeout })
  return bubble
}
