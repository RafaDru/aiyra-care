import { resolveDeploymentTier } from '../ops/investigator-environment.js'

/** Portais payer/provider via scraper ou sessão não contratada — ver docs/principles/connect-showcase-not-production.md */
export const PRIVATE_SCRAPE_PORTAL_TYPES = new Set([
  'unimed',
  'amil',
  'bradesco_saude',
  'mater_dei',
  'hermes_pardini',
])

export function isPrivateScrapePortal(portalType: string): boolean {
  return PRIVATE_SCRAPE_PORTAL_TYPES.has(portalType)
}

/**
 * Scrape privado permitido em integration/preview local; bloqueado em `DEPLOYMENT_TIER=production`
 * salvo opt-in explícito (`CONNECT_PRIVATE_SCRAPE_ENABLED=1` ou showcase).
 */
export function isPrivateScrapeAllowedInDeployment(env: NodeJS.ProcessEnv = process.env): boolean {
  const override = env.CONNECT_PRIVATE_SCRAPE_ENABLED?.trim().toLowerCase()
  if (override === '1' || override === 'true' || override === 'yes') return true
  if (override === '0' || override === 'false' || override === 'no') return false

  if (env.CONNECT_SHOWCASE_MODE === '1' || env.CONNECT_SHOWCASE_MODE?.toLowerCase() === 'true') {
    return true
  }

  const tier = resolveDeploymentTier(env)
  return tier !== 'production'
}
