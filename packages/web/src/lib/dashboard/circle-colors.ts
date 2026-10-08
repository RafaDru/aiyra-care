/** Fixed palette for care-circle tags on the dashboard (6–8 colors). */
export const CARE_CIRCLE_COLORS = [
  '#4F46E5',
  '#0D9488',
  '#E11D48',
  '#D97706',
  '#7C3AED',
  '#0891B2',
  '#BE185D',
  '#65A30D',
] as const

const UNASSIGNED_COLOR = '#64748B'

export function circleColorForId(circleId: string | null | undefined): string {
  if (!circleId) return UNASSIGNED_COLOR
  let hash = 0
  for (let i = 0; i < circleId.length; i++) {
    hash = (hash * 31 + circleId.charCodeAt(i)) | 0
  }
  return CARE_CIRCLE_COLORS[Math.abs(hash) % CARE_CIRCLE_COLORS.length]
}
