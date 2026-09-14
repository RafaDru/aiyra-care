export type DeploymentTier = 'integration' | 'preview' | 'production'

export interface InvestigatorEnvironmentContext {
  deploymentTier: DeploymentTier
  apiPublicUrl: string
}

const VALID_TIERS: ReadonlySet<DeploymentTier> = new Set([
  'integration',
  'preview',
  'production',
])

/** Tier canônico — somente `DEPLOYMENT_TIER`; não infere por porta. */
export function resolveDeploymentTier(
  env: NodeJS.ProcessEnv = process.env,
): DeploymentTier {
  const raw = env.DEPLOYMENT_TIER?.trim().toLowerCase()
  if (raw && VALID_TIERS.has(raw as DeploymentTier)) {
    return raw as DeploymentTier
  }
  return 'integration'
}

export function resolveInvestigatorEnvironmentContext(
  env: NodeJS.ProcessEnv = process.env,
): InvestigatorEnvironmentContext {
  const deploymentTier = resolveDeploymentTier(env)
  const explicit = env.API_PUBLIC_URL?.trim()
  if (explicit) {
    return { deploymentTier, apiPublicUrl: explicit.replace(/\/$/, '') }
  }
  const port = env.PORT?.trim() || '3010'
  const host = env.API_PUBLIC_HOST?.trim() || '127.0.0.1'
  return { deploymentTier, apiPublicUrl: `http://${host}:${port}` }
}
