import { test } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'
import { openAvaDock, sendAvaMessage, waitForAvaAssistantReply } from '../helpers/ava'

test.describe('ava-companion-smoke', () => {
  test.describe.configure({ retries: process.env.CI ? 2 : 0 })

  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('dock abre e responde mensagem de saúde (modo teste)', async ({ page }) => {
    await ensureQaE2eSession(page, { keepAvaDock: true })

    await openAvaDock(page)
    await sendAvaMessage(page, 'Quais exames recentes do paciente?')
    await waitForAvaAssistantReply(page, /Resposta de teste Ava|exames|não há/i)
  })
})
