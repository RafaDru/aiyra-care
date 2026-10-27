import type { IntegrationOption } from '../components/integrations/integration-catalog.js'

const PRIVATE_SCRAPE_PORTALS = new Set([
  'unimed',
  'amil',
  'bradesco_saude',
  'mater_dei',
  'hermes_pardini',
])

/** Espelha API `private-scrape-portal.policy` — manter regras alinhadas. */
export function isPrivateScrapeUiEnabled(): boolean {
  const override = import.meta.env.VITE_CONNECT_PRIVATE_SCRAPE_ENABLED?.trim().toLowerCase()
  if (override === '1' || override === 'true' || override === 'yes') return true
  if (override === '0' || override === 'false' || override === 'no') return false

  if (import.meta.env.VITE_CONNECT_SHOWCASE_MODE === '1') return true

  const tier = import.meta.env.VITE_DEPLOYMENT_TIER?.trim().toLowerCase()
  if (tier === 'production') return false
  return true
}

export function applyPrivateScrapeCatalogPolicy(option: IntegrationOption): IntegrationOption {
  if (isPrivateScrapeUiEnabled()) return option
  if (option.action !== 'link' || !option.portalType) return option
  if (!PRIVATE_SCRAPE_PORTALS.has(option.portalType)) return option
  return {
    ...option,
    enabled: false,
    disabledReason: 'Disponível só em ambiente de demonstração',
  }
}
