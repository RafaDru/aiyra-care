import type { PortalCredentials, PortalType } from '../../domain/scraper/portal-credentials.js'
import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import type { ScraperResult } from '../../domain/scraper/scraper-types.js'
import type { HealthPortalScraper } from '../../domain/scraper/health-portal-scraper.js'
import { ConecteSUSPortalAdapter } from '../../infrastructure/scraper/conectesus.portal.js'
import { UnimedPortalAdapter } from '../../infrastructure/scraper/unimed.portal.js'
import { AmilPortalAdapter } from '../../infrastructure/scraper/amil.portal.js'
import { CadernetaPortalAdapter } from '../../infrastructure/scraper/caderneta.portal.js'
import { BradescoSaudePortalAdapter } from '../../infrastructure/scraper/bradesco-saude.portal.js'

const portalAdapters: Record<string, () => HealthPortalScraper> = {
  conectesus: () => new ConecteSUSPortalAdapter(),
  caderneta: () => new CadernetaPortalAdapter(),
  unimed: () => new UnimedPortalAdapter(),
  amil: () => new AmilPortalAdapter(),
  bradesco_saude: () => new BradescoSaudePortalAdapter(),
}

export class AgenticScraperService {
  async scrape(
    portalType: PortalType,
    credentials: PortalCredentials,
    onProgress?: (p: ScraperProgress) => void,
  ): Promise<ScraperResult> {
    const factory = portalAdapters[portalType]
    if (!factory) throw new Error(`Portal não suportado: ${portalType}`)

    const adapter = factory()
    return adapter.scrape(credentials, onProgress)
  }

  listSupportedPortals() {
    return Object.keys(portalAdapters)
  }
}
