import { chromium, request as playwrightRequest } from 'playwright'
import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import { probeHermesPardiniExams, type HermesPardiniExamProbeItem } from './hermes-pardini-bff.probe.js'
import {
  buildHermesPardiniSession,
  fetchHermesPardiniUserInfo,
  isHermesPardiniSessionValid,
  loginHermesPardiniApi,
  parseHermesPardiniSessionJson,
  refreshHermesPardiniApi,
  renewHermesPardiniSessionIfNeeded,
  type HermesPardiniSession,
} from './hermes-pardini-auth.js'
import { loginHermesPardiniViaBrowser } from './hermes-pardini-login.helper.js'
import { hermesPardiniPortalEntryUrl } from './hermes-pardini.portal.js'

export interface HermesPardiniSyncResult {
  session: HermesPardiniSession
  exams: HermesPardiniExamProbeItem[]
  discoveredPath?: string
  warnings: string[]
  postLoginUrl?: string
}

function allowHermesPardiniBrowser(): boolean {
  return process.env.HERMES_PARDINI_ALLOW_BROWSER === '1'
}

async function acquireHermesPardiniSession(
  login: string,
  password: string,
  emit: (p: ScraperProgress) => void,
  opts?: { sessionJson?: string; interactiveLogin?: boolean },
): Promise<HermesPardiniSession> {
  const request = await playwrightRequest.newContext()

  try {
    if (opts?.sessionJson) {
      const parsed = parseHermesPardiniSessionJson(opts.sessionJson)
      let session = await renewHermesPardiniSessionIfNeeded(request, parsed)
      if (!isHermesPardiniSessionValid(session) && parsed.refreshToken) {
        const refreshed = await refreshHermesPardiniApi(request, parsed.refreshToken)
        if (refreshed) {
          const profile = await fetchHermesPardiniUserInfo(request, refreshed.accessToken)
          session = buildHermesPardiniSession(login, refreshed.accessToken, refreshed.refreshToken, profile)
        }
      }
      if (isHermesPardiniSessionValid(session)) {
        emit({ step: 'login', message: 'Sessão Hermes Pardini salva (HTTP)...', status: 'success' })
        return session
      }
      emit({ step: 'login', message: 'Sessão expirada — renovando...', status: 'running' })
    }

    try {
      const tokens = await loginHermesPardiniApi(request, login, password)
      const profile = await fetchHermesPardiniUserInfo(request, tokens.accessToken)
      emit({
        step: 'login',
        message: profile.name
          ? `Conectado como ${profile.name}`
          : 'Autenticado no Hermes Pardini (Precision Care)',
        status: 'success',
      })
      return buildHermesPardiniSession(login, tokens.accessToken, tokens.refreshToken, profile)
    } catch (apiErr) {
      const apiMsg = apiErr instanceof Error ? apiErr.message : String(apiErr)
      const canTryBrowser = opts?.interactiveLogin || allowHermesPardiniBrowser()
      if (!canTryBrowser) throw new Error(apiMsg)
      emit({ step: 'login', message: `${apiMsg} — abrindo browser...`, status: 'running' })
    }

    const headless = process.env.HERMES_PARDINI_HEADLESS !== '0'
    const browser = await chromium.launch({ headless })
    try {
      const context = await browser.newContext({
        locale: 'pt-BR',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      })
      const page = await context.newPage()
      const tokens = await loginHermesPardiniViaBrowser(page, login, password)
      const profile = await fetchHermesPardiniUserInfo(request, tokens.accessToken)
      emit({ step: 'login', message: 'Login via browser — sessão capturada', status: 'success' })
      return buildHermesPardiniSession(login, tokens.accessToken, tokens.refreshToken, profile)
    } finally {
      await browser.close()
    }
  } finally {
    await request.dispose()
  }
}

export class HermesPardiniSyncScraper {
  /**
   * Sync Hermes Pardini via Precision Care:
   * 1. Sessão salva + refresh HTTP
   * 2. Keycloak ROPC (sem browser)
   * 3. Browser só se interactiveLogin e ROPC falhar
   */
  async scrape(
    login: string,
    password: string,
    onProgress?: ScraperProgress,
    opts?: { sessionJson?: string; interactiveLogin?: boolean },
  ): Promise<HermesPardiniSyncResult> {
    const emit = (step: string, message: string, status: ScraperProgress['status']) =>
      onProgress?.({ step, message, status })

    emit('login', 'Autenticando no Hermes Pardini…', 'running')
    const session = await acquireHermesPardiniSession(
      login,
      password,
      (p) => onProgress?.(p),
      opts,
    )

    const request = await playwrightRequest.newContext()
    try {
      emit('fetch-exams', 'Buscando resultados no Precision Care…', 'running')
      const probe = await probeHermesPardiniExams(request, session.accessToken)
      const warnings = [...probe.warnings]
      if (probe.discoveredPath) {
        emit(
          'fetch-exams',
          `${probe.exams.length} exame(s) em ${probe.discoveredPath}`,
          probe.exams.length > 0 ? 'success' : 'running',
        )
      } else if (warnings.length > 0) {
        emit('fetch-exams', warnings[0], 'running')
      }

      return {
        session,
        exams: probe.exams,
        discoveredPath: probe.discoveredPath,
        warnings,
        postLoginUrl: hermesPardiniPortalEntryUrl(),
      }
    } finally {
      await request.dispose()
    }
  }

  /** @deprecated use scrape() */
  async probeLogin(
    login: string,
    password: string,
    onProgress?: ScraperProgress,
  ): Promise<{
    region: 'mg' | 'sp'
    loginUrl: string
    loggedIn: boolean
    postLoginUrl: string
    warnings: string[]
  }> {
    const result = await this.scrape(login, password, onProgress, { interactiveLogin: true })
    return {
      region: 'mg',
      loginUrl: hermesPardiniPortalEntryUrl(),
      loggedIn: true,
      postLoginUrl: result.postLoginUrl ?? hermesPardiniPortalEntryUrl(),
      warnings: result.warnings,
    }
  }
}
