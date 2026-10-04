import { expect, type Page } from '@playwright/test'
import { dismissFirstVisitTour } from './ui'

const AVA_FAB_LABEL = /Abrir conversa com Ava|Open chat with Ava/i
const AVA_COMPOSER_PLACEHOLDER = /febre|fever|Ex\.:|E\.g\./i
const AVA_NEW_CONVERSATION = /^(Nova conversa|New conversation)$/

function isAvaChatPostUrl(method: string, url: string) {
  if (method !== 'POST') return false
  try {
    return new URL(url).pathname.includes('/ava/chat')
  } catch {
    return false
  }
}

/** FAB no layout; chat no Drawer (portal — fora de .ava-global-dock). */
function avaDockTrigger(page: Page) {
  return page.locator('.ava-global-dock .ava-dock-trigger')
}

/** Único AvaChatPanel na app (drawer em portal). */
function avaComposerRoot(page: Page) {
  return page.locator('.ava-chat-panel__composer')
}

function avaAssistantBubbleBodies(page: Page) {
  return page.getByTestId('ava-assistant-bubble').locator('.ava-chat-bubble__body')
}

function avaComposerInput(page: Page) {
  return avaComposerRoot(page).getByPlaceholder(AVA_COMPOSER_PLACEHOLDER)
}

function avaSendButton(page: Page) {
  return avaComposerRoot(page).locator('.ava-chat-panel__composer-actions button.ant-btn-primary')
}

async function ensureAvaSharingOptIn(page: Page) {
  const box = avaComposerRoot(page).getByRole('checkbox').first()
  if (await box.isVisible().catch(() => false)) {
    if (!(await box.isChecked().catch(() => false))) {
      await box.check()
    }
  }
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
    await avaDockTrigger(page).click({ force: true })
    await page.getByPlaceholder(AVA_COMPOSER_PLACEHOLDER).waitFor({ state: 'visible', timeout: 25_000 })
    await convoList
  }).toPass({ timeout: 60_000 })

  await waitForAvaDockSettled(page)
}

/** Nova conversa — evita bolha stale de specs anteriores no mesmo usuário QA. */
export async function startFreshAvaConversation(page: Page) {
  await expect(async () => {
    const btn = page.getByRole('button', { name: AVA_NEW_CONVERSATION })
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
    }
    const avaRows = page.getByTestId('ava-assistant-bubble')
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
  await ensureAvaSharingOptIn(page)

  const input = avaComposerInput(page)
  const send = avaSendButton(page)
  const chatStarted = page.waitForRequest(
    (r) => isAvaChatPostUrl(r.method(), r.url()),
    { timeout: 45_000 },
  )
  const chatFinished = page.waitForResponse(
    (r) => isAvaChatPostUrl(r.request().method(), r.url()) && r.ok(),
    { timeout: 90_000 },
  )
  await input.fill(text)
  await expect(send).toBeEnabled({ timeout: 30_000 })
  await send.click({ force: true })

  await chatStarted
  await chatFinished
  await expect(send).not.toHaveClass(/ant-btn-loading/, { timeout: 90_000 })
  await waitAvaComposerReady(page)
}

export async function sendAvaMessage(page: Page, text: string) {
  await submitAvaMessage(page, text)
  const replyPattern = process.env.CI
    ? /Resposta de teste Ava|companheira de cuidado|saúde na família|exames|vacina|não há/i
    : /.{8,}/
  await waitForAvaAssistantReply(page, replyPattern, 90_000)
  await waitAvaComposerReady(page)
}

export async function waitForAvaAssistantBubble(page: Page, timeout = 45_000) {
  const bubble = page.getByTestId('ava-assistant-bubble').last()
  await bubble.waitFor({ state: 'visible', timeout })
  return bubble
}
