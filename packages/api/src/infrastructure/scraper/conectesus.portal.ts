import type { PortalCredentials } from '../../domain/scraper/portal-credentials.js'
import type { HealthPortalScraper, ScraperConfig, ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import type { ScraperResult } from '../../domain/scraper/scraper-types.js'

/** @deprecated Use PublicHealthScrapeService via POST /scraper/conectesus (sessão gov.br persistida). */
export class ConecteSUSPortalAdapter implements HealthPortalScraper {
  readonly config: ScraperConfig = {
    portalType: 'conectesus',
    baseUrl: 'https://meususdigital.saude.gov.br',
  }

  async scrape(_credentials: PortalCredentials, _onProgress?: (p: ScraperProgress) => void): Promise<ScraperResult> {
    throw new Error('Use POST /scraper/conectesus com autenticação de conta')
  }
}
