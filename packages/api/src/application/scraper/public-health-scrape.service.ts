import type { Pool } from 'pg'
import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import type { ScraperResult } from '../../domain/scraper/scraper-types.js'
import { GovBrSessionService } from '../govbr/govbr-session.service.js'
import { ConecteSUSGateway } from '../../infrastructure/conectesus/conectesus-gateway.js'
import { CadernetaGateway } from '../../infrastructure/caderneta/caderneta-gateway.js'

export class PublicHealthScrapeService {
  private readonly govBr: GovBrSessionService

  constructor(private readonly pool: Pool) {
    this.govBr = new GovBrSessionService(pool)
  }

  async scrapeConecteSUS(
    accountId: string,
    cpf: string,
    onProgress?: (p: ScraperProgress) => void,
  ): Promise<ScraperResult> {
    const tokenSession = await this.govBr.ensureToken(accountId, onProgress, {
      startUrl: 'https://meususdigital.saude.gov.br/login',
      navigateMessage: 'Abrindo Meu SUS Digital...',
      waitForGovBrButton: true,
    })
    const gateway = new ConecteSUSGateway(tokenSession)
    const result = await gateway.fetchAll(cpf.replace(/\D/g, ''), onProgress)
    await this.govBr.persistTokenSession(accountId, tokenSession)
    await this.govBr.touchConecteSUSFetch(accountId)
    return result
  }

  /** HTTP-only — falha se não há sessão persistida (sync silencioso). */
  async scrapeConecteSUSPersisted(
    accountId: string,
    cpf: string,
  ): Promise<ScraperResult | { skipped: string }> {
    const view = await this.govBr.getView(accountId)
    if (!view.sessionReady) return { skipped: 'session_required' }

    const tokenSession = await this.govBr.createTokenSession(accountId)
    if (!tokenSession.isValid()) return { skipped: 'session_expired' }

    const gateway = new ConecteSUSGateway(tokenSession)
    const result = await gateway.fetchAll(cpf.replace(/\D/g, ''))
    await this.govBr.persistTokenSession(accountId, tokenSession)
    await this.govBr.touchConecteSUSFetch(accountId)
    return result
  }

  async scrapeCaderneta(
    accountId: string,
    onProgress?: (p: ScraperProgress) => void,
  ): Promise<ScraperResult> {
    const tokenSession = await this.govBr.ensureToken(accountId, onProgress, {
      startUrl:
        'https://sso.acesso.gov.br/authorize?response_type=code&client_id=conectesus-app.saude.gov.br&scope=openid+email+phone+profile+govbr_confiabilidades&redirect_uri=https://cadernetadacrianca.saude.gov.br/login&nonce=aiyracare-caderneta&state=aiyracare-caderneta',
      navigateMessage: 'Abrindo Caderneta da Criança (gov.br)...',
    })
    const gateway = new CadernetaGateway(tokenSession)
    const result = await gateway.fetchAll(undefined, onProgress)
    await this.govBr.persistTokenSession(accountId, tokenSession)
    return result
  }

  getGovBrSessionView(accountId: string) {
    return this.govBr.getView(accountId)
  }
}
