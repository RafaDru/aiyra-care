import type { OpsDeploymentTier } from './ops-environment.js'

/** Labels do chip no header CH (spec Rafael 2026-09-24). */
export const CH_ENV_CHIP_LABELS: Record<OpsDeploymentTier, string> = {
  integration: 'Desenvolvimento',
  preview: 'Preview',
  production: 'Produção',
}

export function chEnvChipClass(tier: OpsDeploymentTier): string {
  return `ch-env-chip ch-env-chip--${tier}`
}
