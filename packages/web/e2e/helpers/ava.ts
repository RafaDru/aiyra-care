import { expect, type Page } from '@playwright/test'
import { dismissFirstVisitTour } from './ui'

function isAvaChatPostUrl(method: string, url: string) {
  if (method !== 'POST') return false
  try {
    return new URL(url).pathname.includes('/ava/chat')
  } catch {
    return false
  }
}

function avaAssistantBubbleBodies(page: Page) {
  return page.locator('.ava-chat-bubble-row--ava .ava-chat-bubble__body')
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

async function waitForAvaFab(page: Page, timeout = 60_000) {
  await page
    .waitForResponse(
      (r) => {
        try {
          return new URL(r.url()).pathname === '/patients' && r.request().method() === 'GET' && r.ok()
        } catch {
          return false
        }
      },
      { timeout },
    )
    .catch(() => undefined)
  await page.getByRole('button', { name: 'Abrir conversa com Ava' }).waitFor({
    state: 'visible',
    timeout,
  })
}

export async function openAvaDock(page: Page) {
  await dismissFirstVisitTour(page)
  await waitForAvaFab(page)
  if (process.env.CI) {
    // useAvaDockIntro: greeting + settling (~6.4s) antes do dock ficar estável no CI.
    await page.waitForTimeout(7_000)
  }

  await expect(async () => {
    const convoList = page
      .waitForResponse((r) => /\/ava\/conversations/.test(r.url()) && r.ok(), { timeout: 25_000 })
      .catch(() => null)
    await page.getByRole('button', { name: 'Abrir conversa com Ava' }).click({ force: true })
    await page.getByPlaceholder(/febre|Ex\.:/i).waitFor({ state: 'visible', timeout: 25_000 })
    await convoList
  }).toPass({ timeout: 60_000 })

  await waitForAvaDockSettled(page)
}

/** Nova conversa — evita bolha stale de specs anteriores no mesmo usuário QA. */
export async function startFreshAvaConversation(page: Page) {
  await expect(async () => {
    const avaRows = page.locator('.ava-chat-bubble-row--ava')
    const count = await avaRows.count()
    if (count > 0) {
      const btn = page.getByRole('button', { name: 'Nova conversa' })
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
      }
    }
    expect(await avaRows.count()).toBe(0)
  }).toPass({ timeout: 30_000 })
  await waitAvaComposerReady(page)
}

/** Aguarda texto na última bolha da Ava com conteúdo (SSE / streaming). */
export async function waitForAvaAssistantReply(
  page: Page,
  pattern: RegExp,
  timeout = 90_000,
) {
  const send = page.getByRole('button', { name: 'Enviar' })
  await expect(send).not.toHaveClass(/ant-btn-loading/, { timeout })

  await expect(async () => {
    const bodies = avaAssistantBubbleBodies(page)
    const count = await bodies.count()
    expect(count).toBeGreaterThan(0)
    let matched = false
    for (let i = count - 1; i >= 0; i--) {
      const body = bodies.nth(i)
      const text = (await body.innerText()).replace(/^Ava\s*/i, '').trim()
      if (text.length === 0) continue
      await expect(body).toContainText(pattern)
      matched = true
      break
    }
    expect(matched).toBe(true)
  }).toPass({ timeout })

  const bodies = avaAssistantBubbleBodies(page)
  const count = await bodies.count()
  for (let i = count - 1; i >= 0; i--) {
    const body = bodies.nth(i)
    const text = (await body.innerText()).replace(/^Ava\s*/i, '').trim()
    if (text.length > 0) return body
  }
  return bodies.last()
}

export async function submitAvaMessage(page: Page, text: string) {
  await waitAvaComposerReady(page)
  const avaBubblesBefore = await page.locator('.ava-chat-bubble-row--ava').count()

  const input = page.getByPlaceholder(/febre|Ex\.:/i)
  const send = page.getByRole('button', { name: 'Enviar' })
  const chatResponse = page.waitForResponse(
    (r) => isAvaChatPostUrl(r.request().method(), r.url()),
    { timeout: 90_000 },
  )
  await input.fill(text)
  await expect(send).toBeEnabled({ timeout: 30_000 })
  await send.click({ force: true })

  const response = await chatResponse
  if (!response.ok()) {
    const body = await response.text().catch(() => '')
    throw new Error(`Ava chat HTTP ${response.status()}: ${body.slice(0, 240)}`)
  }
  await expect(page.locator('.ava-chat-bubble-row--ava')).toHaveCount(avaBubblesBefore + 1, {
    timeout: 90_000,
  })
  await waitAvaComposerReady(page)
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
