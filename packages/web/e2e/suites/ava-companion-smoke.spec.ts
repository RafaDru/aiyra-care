import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'
import { openAvaDock, sendAvaMessage, waitForAvaAssistantBubble } from '../helpers/ava'

test.describe('ava-companion-smoke', () => {
  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('dock abre e responde mensagem de saúde (modo teste)', async ({ page }) => {
    await ensureQaE2eSession(page, { keepAvaDock: true })

    await openAvaDock(page)
    await sendAvaMessage(page, 'Quais exames recentes do paciente?')
    const bubble = await waitForAvaAssistantBubble(page)

    await expect(bubble).toContainText(/Resposta de teste Ava|exames|não há/i)
  })
})
