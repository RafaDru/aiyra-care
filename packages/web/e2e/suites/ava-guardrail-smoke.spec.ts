import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'
import { openAvaDock, sendAvaMessage, waitForAvaAssistantBubble } from '../helpers/ava'

test.describe('ava-guardrail-smoke', () => {
  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('off-topic bloqueado; saúde segue fluxo normal', async ({ page }) => {
    await ensureQaE2eSession(page, { keepAvaDock: true })

    await openAvaDock(page)
    await sendAvaMessage(page, 'Qual a receita de bolo de chocolate?')
    const guardrailBubble = await waitForAvaAssistantBubble(page)
    await expect(guardrailBubble).toContainText(/companheira de cuidado|saúde na família/i)

    await sendAvaMessage(page, 'Quais vacinas constam no perfil?')
    const healthBubble = await waitForAvaAssistantBubble(page)
    await expect(healthBubble).toContainText(/Resposta de teste Ava|vacina|não há/i)
  })
})
