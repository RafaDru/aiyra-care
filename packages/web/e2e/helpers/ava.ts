import { expect, type Page } from '@playwright/test'
import { dismissFirstVisitTour } from './ui'

const AVA_FAB_LABEL = /Abrir conversa com Ava|Open chat with Ava/i
const AVA_COMPOSER_PLACEHOLDER = /febre|fever|Ex\.:|E\.g\./i
const AVA_SEND_LABEL = /^(Enviar|Send)$/
const AVA_NEW_CONVERSATION = /^(Nova conversa|New conversation)$/

function isAvaChatPostUrl(method: string, url: string) {
  if (method !== 'POST') return false
  try {
    return new URL(url).pathname.includes('/ava/chat')
  } catch {
    return false
  }
}

function avaChatShell(page: Page) {
  return page.locator('.ava-chat-shell')
}

function avaAssistantBubbleBodies(page: Page) {
  return avaChatShell(page).locator('.ava-chat-bubble-row--ava .ava-chat-bubble__body')
}

function avaComposerInput(page: Page) {
  return avaChatShell(page).getByPlaceholder(AVA_COMPOSER_PLACEHOLDER)
}

function avaSendButton(page: Page) {
  return avaChatShell(page).getByRole('button', { name: AVA_SEND_LABEL })
}

async function waitForAvaChatPostComplete(page: Page, timeout = 90_000) {
  await page.waitForResponse(
    (r) => isAvaChatPostUrl(r.request().method(), r.url()) && r.ok(),
    { timeout },
  )
}

async function waitAvaComposerReady(page: Page, timeout = 90_000) {
  const input = avaComposerInput(page)
  const send = avaSendButton(page)
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

async function waitForAvaFab(page: Page, timeout = 45_000) {
  // ensureQaE2eSession já hidratou pacientes — só aguardar o FAB (evita stall de 60s no CI).
  await page.getByRole('button', { name: AVA_FAB_LABEL }).waitFor({
    state: 'visible',
    timeout,
  })
}

export async function openAvaDock(page: Page) {
  await dismissFirstVisitTour(page)
  // useAvaDockIntro pula animação (~6.4s) — estabiliza abertura do drawer no CI.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await waitForAvaFab(page)

  await expect(async () => {
    const convoList = page
      .waitForResponse((r) => /\/ava\/conversations/.test(r.url()) && r.ok(), { timeout: 25_000 })
      .catch(() => null)
    await page.getByRole('button', { name: AVA_FAB_LABEL }).click({ force: true })
    await page.locator('.ava-chat-drawer .ant-drawer-content').waitFor({
      state: 'visible',
      timeout: 25_000,
    })
    await avaComposerInput(page).waitFor({ state: 'visible', timeout: 25_000 })
    await convoList
  }).toPass({ timeout: 60_000 })

  await waitForAvaDockSettled(page)
}

/** Nova conversa — evita bolha stale de specs anteriores no mesmo usuário QA. */
export async function startFreshAvaConversation(page: Page) {
  await expect(async () => {
    const avaRows = avaChatShell(page).locator('.ava-chat-bubble-row--ava')
    const count = await avaRows.count()
    if (count > 0) {
      const btn = avaChatShell(page).getByRole('button', { name: AVA_NEW_CONVERSATION })
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
  const send = avaSendButton(page)
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

  const input = avaComposerInput(page)
  const send = avaSendButton(page)
  const chatComplete = waitForAvaChatPostComplete(page)
  await input.fill(text)
  await expect(send).toBeEnabled({ timeout: 30_000 })
  await send.click({ force: true })

  await chatComplete
  await waitAvaComposerReady(page)
}

export async function sendAvaMessage(page: Page, text: string) {
  await submitAvaMessage(page, text)
  await waitForAvaAssistantReply(page, /.{8,}/, 90_000)
  await waitAvaComposerReady(page)
}

export async function waitForAvaAssistantBubble(page: Page, timeout = 45_000) {
  const bubble = avaChatShell(page).locator('.ava-chat-bubble-row--ava').last()
  await bubble.waitFor({ state: 'visible', timeout })
  return bubble
}
