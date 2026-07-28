import type { PortalCredentials } from '../../domain/scraper/portal-credentials.js'
import type { HealthPortalScraper, ScraperConfig, ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import type { ScraperResult, ScrapedVaccine, ScrapedExam } from '../../domain/scraper/scraper-types.js'
import { chromium } from 'playwright'
import { GroqLlmAdapter } from '../llm/groq-llm.adapter.js'
import { AuthAgent } from './agents/auth.agent.js'
import { NavAgent } from './agents/nav.agent.js'
import { ExtractAgent } from './agents/extract.agent.js'

export interface AgentPortalConfig {
  portalType: 'unimed' | 'amil' | 'bradesco_saude'
  label: string
  loginUrl: string
  baseUrl: string
}

export class GenericAgentPortalAdapter implements HealthPortalScraper {
  readonly config: ScraperConfig
  private readonly llm = new GroqLlmAdapter()
  private readonly authAgent = new AuthAgent(this.llm)
  private readonly navAgent = new NavAgent(this.llm)
  private readonly extractAgent = new ExtractAgent(this.llm)

  constructor(private readonly portalConfig: AgentPortalConfig) {
    this.config = {
      portalType: portalConfig.portalType,
      baseUrl: portalConfig.baseUrl,
    }
  }

  async scrape(credentials: PortalCredentials, onProgress?: (p: ScraperProgress) => void): Promise<ScraperResult> {
    const emit = (step: string, message: string, status: ScraperProgress['status']) => onProgress?.({ step, message, status })

    const browser = await chromium.launch({
      headless: false,
      channel: 'chrome',
      args: ['--disable-blink-features=AutomationControlled'],
    })
    const context = await browser.newContext({
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    })
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false })
    })
    const page = await context.newPage()

    try {
      emit('navigate', `Abrindo ${this.portalConfig.label}...`, 'running')
      await page.goto(this.portalConfig.loginUrl, { waitUntil: 'networkidle', timeout: 30000 })

      emit('login', `Faça login no ${this.portalConfig.label} na janela aberta.`, 'running')
      const authError = await this.authAgent.login(page, credentials)
      if (authError) {
        emit('login', authError.message, 'failed')
        throw new Error(authError.message)
      }
      emit('login', 'Login detectado! Coletando dados...', 'success')

      const patientName = await this.extractAgent.extractPatientName(page)

      emit('fetch-vaccines', 'Buscando vacinas...', 'running')
      const navVaccinesResult = await this.navAgent.navigateTo(page, 'vaccines')
      const vaccines: ScrapedVaccine[] = navVaccinesResult === null
        ? await this.extractAgent.extractVaccines(page)
        : []
      emit('fetch-vaccines', `${vaccines.length} vacinas encontradas`, 'success')

      emit('fetch-exams', 'Buscando exames...', 'running')
      await page.goto(this.portalConfig.loginUrl, { waitUntil: 'networkidle', timeout: 30000 })
      const navExamsResult = await this.navAgent.navigateTo(page, 'exams')
      const exams: ScrapedExam[] = navExamsResult === null
        ? await this.extractAgent.extractExams(page)
        : []
      emit('fetch-exams', `${exams.length} exames encontrados`, 'success')

      emit('fetch-prescriptions', 'Buscando receitas...', 'running')
      await page.goto(this.portalConfig.loginUrl, { waitUntil: 'networkidle', timeout: 30000 })
      const navRxResult = await this.navAgent.navigateTo(page, 'prescriptions')
      const prescriptions = navRxResult === null
        ? await this.extractAgent.extractPrescriptions(page)
        : []
      emit('fetch-prescriptions', `${prescriptions.length} receitas encontradas`, 'success')

      return {
        patientName,
        vaccines,
        exams,
        prescriptions,
        rawPages: [],
      }
    } finally {
      await browser.close()
    }
  }
}
