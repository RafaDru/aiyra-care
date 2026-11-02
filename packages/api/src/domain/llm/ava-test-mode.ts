import { AGENT_DISPLAY_NAME } from '../brand/platform-display.js'

export const AVA_TEST_MODE_REPLY_PT =
  `Resposta de teste ${AGENT_DISPLAY_NAME}: recebi sua mensagem sobre o cuidado de saúde deste perfil.`

export function isAvaTestModeEnabled(): boolean {
  const raw = process.env.AVA_TEST_MODE?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'on'
}
