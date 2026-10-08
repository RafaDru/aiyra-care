/** Hub principal de família / círculos de cuidado (fora de Configurações). */
export const FAMILY_HUB_PATH = '/family' as const

/** Link para o hub com família ativa (ex.: pós-onboarding). */
export function familyHubPath(circleId?: string | null): string {
  if (!circleId) return FAMILY_HUB_PATH
  return `${FAMILY_HUB_PATH}?circle=${encodeURIComponent(circleId)}`
}
