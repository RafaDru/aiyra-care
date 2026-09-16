import type { PortalCredentials } from '../../domain/scraper/portal-credentials.js'
import type { HealthPortalScraper, ScraperConfig, ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import type { ScraperResult } from '../../domain/scraper/scraper-types.js'

/** @deprecated Use PublicHealthScrapeService via POST /scraper/caderneta (sessão gov.br persistida). */
export class CadernetaPortalAdapter implements HealthPortalScraper {
  readonly config: ScraperConfig = {
    portalType: 'caderneta',
    baseUrl: 'https://cadernetadacrianca.saude.gov.br',
  }

  async scrape(_credentials: PortalCredentials, _onProgress?: (p: ScraperProgress) => void): Promise<ScraperResult> {
    throw new Error('Use POST /scraper/caderneta com autenticação de conta')
  }
}
