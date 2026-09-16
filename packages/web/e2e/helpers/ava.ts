import { expect, type Page } from '@playwright/test'

function avaAssistantBubbleBody(page: Page) {
  return page.locator('.ava-chat-bubble-row--ava').last().locator('.ava-chat-bubble__body')
}

async function waitAvaComposerReady(page: Page, timeout = 90_000) {
  const input = page.getByPlaceholder(/febre|Ex\.:/i)
  const send = page.getByRole('button', { name: 'Enviar' })
  await input.waitFor({ state: 'visible', timeout })
  await send.waitFor({ state: 'visible', timeout })
  await expect(input).toBeEnabled({ timeout })
  await expect(send).not.toHaveClass(/ant-btn-loading/, { timeout })
  // Send stays disabled until input has text — only assert enabled after fill (submitAvaMessage).
}

/** Aguarda resume de conversa e lista de mensagens após abrir o dock. */
async function waitForAvaDockSettled(page: Page, timeout = 30_000) {
  await page
    .waitForResponse((r) => /\/ava\/conversations/.test(r.url()) && r.ok(), { timeout })
    .catch(() => {})
  await page
    .waitForResponse((r) => /\/ava\/conversations\/[^/]+\/messages/.test(r.url()) && r.ok(), {
      timeout: 15_000,
    })
    .catch(() => {})
  await waitAvaComposerReady(page, timeout)
}

export async function openAvaDock(page: Page) {
  const convoList = page
    .waitForResponse((r) => /\/ava\/conversations/.test(r.url()) && r.ok(), { timeout: 30_000 })
    .catch(() => null)

  await page.getByRole('button', { name: 'Abrir conversa com Ava' }).click({ force: true })
  await page.getByPlaceholder(/febre|Ex\.:/i).waitFor({ state: 'visible', timeout: 30_000 })
  await convoList
  await waitForAvaDockSettled(page)
}

/** Nova conversa — evita bolha stale de specs anteriores no mesmo usuário QA. */
export async function startFreshAvaConversation(page: Page) {
  const btn = page.getByRole('button', { name: 'Nova conversa' })
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
    await waitAvaComposerReady(page)
  }
}

/** Aguarda texto na última bolha da Ava (SSE pode atrasar no CI). */
export async function waitForAvaAssistantReply(
  page: Page,
  pattern: RegExp,
  timeout = 90_000,
) {
  const body = avaAssistantBubbleBody(page)
  await expect(body).toBeVisible({ timeout })
  // Ignora só a tag "Ava" — bolha streaming aparece vazia antes do SSE.
  await expect(async () => {
    const text = (await body.innerText()).replace(/^Ava\s*/i, '').trim()
    expect(text.length).toBeGreaterThan(0)
  }).toPass({ timeout })
  await expect(body).toContainText(pattern, { timeout })
  return body
}

export async function submitAvaMessage(page: Page, text: string) {
  await waitAvaComposerReady(page)
  const avaBubblesBefore = await page.locator('.ava-chat-bubble-row--ava').count()

  const input = page.getByPlaceholder(/febre|Ex\.:/i)
  const send = page.getByRole('button', { name: 'Enviar' })
  await input.fill(text)
  await expect(send).toBeEnabled({ timeout: 30_000 })
  await send.click()

  await expect(page.locator('.ava-chat-bubble-row--ava')).toHaveCount(avaBubblesBefore + 1, {
    timeout: 45_000,
  })
}

export async function sendAvaMessage(page: Page, text: string) {
  await submitAvaMessage(page, text)
  await waitForAvaAssistantReply(page, /.{8,}/, 90_000)
  await waitAvaComposerReady(page)
}

export async function waitForAvaAssistantBubble(page: Page, timeout = 45_000) {
  const bubble = page.locator('.ava-chat-bubble-row--ava').last()
  await bubble.waitFor({ state: 'visible', timeout })
  return bubble
}
