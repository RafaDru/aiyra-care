export type OpsDeploymentTier = 'integration' | 'preview' | 'production'

export const OPS_ENVIRONMENT_LABELS: Record<OpsDeploymentTier, string> = {
  integration: 'Ambiente Desenvolvimento',
  preview: 'Ambiente Staging',
  production: 'Ambiente Produtivo',
}

export function normalizeOpsDeploymentTier(
  raw: string | undefined | null,
  consolePort?: number,
): OpsDeploymentTier {
  if (consolePort === 3023) return 'preview'
  if (consolePort === 3013) return 'integration'
  const tier = raw?.trim().toLowerCase()
  if (tier === 'preview' || tier === 'production' || tier === 'integration') return tier
  return 'integration'
}

export function opsEnvironmentClass(tier: OpsDeploymentTier): string {
  return `ops-env-badge ops-env-badge--${tier}`
}
