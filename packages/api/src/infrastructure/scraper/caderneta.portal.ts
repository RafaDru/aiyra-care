import type { PortalCredentials } from '../../domain/scraper/portal-credentials.js'
import type { HealthPortalScraper, ScraperConfig, ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import type { ScraperResult } from '../../domain/scraper/scraper-types.js'
import { CadernetaGateway } from '../caderneta/caderneta-gateway.js'

export class CadernetaPortalAdapter implements HealthPortalScraper {
  readonly config: ScraperConfig = {
    portalType: 'caderneta',
    baseUrl: 'https://cadernetadacrianca.saude.gov.br',
  }

  private readonly gateway = new CadernetaGateway()

  async scrape(credentials: PortalCredentials, onProgress?: (p: ScraperProgress) => void): Promise<ScraperResult> {
    await this.gateway.loginViaBrowser(onProgress)
    // Sempre busca todos os dependentes do responsável logado no gov.br
    return this.gateway.fetchAll(undefined, onProgress)
  }
}
