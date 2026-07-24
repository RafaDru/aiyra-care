import type { PortalCredentials } from '../../domain/scraper/portal-credentials.js'
import type { HealthPortalScraper, ScraperConfig, ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import type { ScraperResult } from '../../domain/scraper/scraper-types.js'
import { ConecteSUSGateway } from '../conectesus/conectesus-gateway.js'

export class ConecteSUSPortalAdapter implements HealthPortalScraper {
  readonly config: ScraperConfig = {
    portalType: 'conectesus',
    baseUrl: 'https://meususdigital.saude.gov.br',
  }

  private readonly gateway = new ConecteSUSGateway()

  async scrape(credentials: PortalCredentials, onProgress?: (p: ScraperProgress) => void): Promise<ScraperResult> {
    await this.gateway.loginViaBrowser(onProgress)
    const cpf = credentials.cpf.replace(/\D/g, '')
    return this.gateway.fetchAll(cpf, onProgress)
  }
}
