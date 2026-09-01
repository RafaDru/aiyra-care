import { chromium, request as playwrightRequest } from 'playwright'
import type { APIRequestContext } from 'playwright'
import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import {
  fetchHermesPardiniExams,
  probeHermesPardiniPacienteAccess,
  type HermesPardiniApiHeaderProfile,
  type HermesPardiniExamItem,
} from './hermes-pardini-bff.service.js'
import {
  buildHermesPardiniSession,
  fetchHermesPardiniUserInfo,
  isHermesPardiniSessionValid,
  parseHermesPardiniSessionJson,
  refreshHermesPardiniApi,
  type HermesPardiniSession,
} from './hermes-pardini-auth.js'
import {
  hermesPardiniBrowserHeadless,
  loginHermesPardiniViaBrowser,
} from './hermes-pardini-login.helper.js'
import { preparePortalPage } from './portal-browser-ui.helper.js'
import {
  fleuryPrecisionOtpTimeoutMs,
  hermesPardiniAllowPasswordOnUnified,
  hermesPardiniPortalEntryUrl,
  hermesPardiniUseUnifiedLogin,
} from './hermes-pardini.portal.js'

export interface HermesPardiniSyncResult {
  session: HermesPardiniSession
  exams: HermesPardiniExamItem[]
  pedidosCount?: number
  discoveredPath?: string
  warnings: string[]
  postLoginUrl?: string
}

function allowHermesPardiniBrowser(): boolean {
  return process.env.HERMES_PARDINI_ALLOW_BROWSER === '1'
}

function isTokenRejectedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /401|403|rejeitado|token hermes pardini/i.test(msg)
}

async function probeWithProfile(
  request: APIRequestContext,
  accessToken: string,
  profile?: HermesPardiniApiHeaderProfile,
): Promise<boolean> {
  return probeHermesPardiniPacienteAccess(request, accessToken, profile)
}

async function acquireHermesPardiniSession(
  login: string,
  password: string,
  emit: (p: ScraperProgress) => void,
  opts?: { sessionJson?: string; interactiveLogin?: boolean; forceFreshLogin?: boolean },
): Promise<HermesPardiniSession> {
  const request = await playwrightRequest.newContext()

  try {
    if (opts?.sessionJson && !opts?.forceFreshLogin) {
      const parsed = parseHermesPardiniSessionJson(opts.sessionJson)
      let session: HermesPardiniSession = parsed

      const jwtValid = isHermesPardiniSessionValid(session)
      const probeOk = jwtValid
        && await probeWithProfile(request, session.accessToken, session.pacienteApiHeaders)

      if (probeOk) {
        emit({ step: 'login', message: 'Sessão Hermes Pardini salva…', status: 'success' })
        return session
      }

      if (jwtValid) {
        emit({ step: 'login', message: 'Sessão salva não aceita na API — renovando…', status: 'running' })
      } else if (parsed.refreshToken) {
        emit({ step: 'login', message: 'Sessão expirada — renovando…', status: 'running' })
      } else {
        emit({ step: 'login', message: 'Sessão expirada — novo login…', status: 'running' })
      }

      if (parsed.refreshToken) {
        const refreshed = await refreshHermesPardiniApi(request, parsed.refreshToken)
        if (refreshed) {
          const profile = await fetchHermesPardiniUserInfo(request, refreshed.accessToken)
          session = buildHermesPardiniSession(login, refreshed.accessToken, refreshed.refreshToken, profile)
          session.pacienteApiHeaders = parsed.pacienteApiHeaders
          if (await probeWithProfile(request, session.accessToken, session.pacienteApiHeaders)) {
            emit({ step: 'login', message: 'Sessão Hermes Pardini renovada (refresh)…', status: 'success' })
            return session
          }
        }
        emit({ step: 'login', message: 'Refresh expirado — novo login no portal…', status: 'running' })
      }
    }

    const canUseBrowser = opts?.interactiveLogin || allowHermesPardiniBrowser()
    if (!canUseBrowser) {
      throw new Error(
        'Hermes Pardini exige login no portal (PKCE) — use Sincronizar em Integrações, não sync silencioso',
      )
    }

    const interactive = opts?.interactiveLogin ?? true
    const headless = hermesPardiniBrowserHeadless(interactive)
    const useUnified = hermesPardiniUseUnifiedLogin()
    const otpTimeoutMs = fleuryPrecisionOtpTimeoutMs()

    emit({
      step: 'login',
      message: headless
        ? useUnified
          ? 'Login Grupo Fleury (OTP) no browser…'
          : 'Login no portal Precision Care (PKCE)…'
        : useUnified
          ? 'Abrindo Grupo Fleury — no Chrome: CPF → código SMS, e-mail ou WhatsApp'
          : 'Abrindo portal Precision Care — aguarde o portal carregar os resultados…',
      status: 'running',
    })

    const browser = await chromium.launch({ headless })
    try {
      const context = await browser.newContext({
        locale: 'pt-BR',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      })
      const page = await context.newPage()
      await preparePortalPage(page)

      const runBrowserLogin = async (
        unifiedEntry: boolean,
        autoFillPassword: boolean,
      ) => loginHermesPardiniViaBrowser(page, login, password, {
        unifiedEntry,
        autoFillPassword,
        prefillUsername: unifiedEntry,
        tokenTimeoutMs: unifiedEntry ? otpTimeoutMs : 120_000,
      })

      let loginResult
      try {
        if (useUnified) {
          loginResult = await runBrowserLogin(
            true,
            hermesPardiniAllowPasswordOnUnified(),
          )
        } else {
          loginResult = await runBrowserLogin(false, true)
        }
      } catch (browserErr) {
        if (useUnified && password?.trim()) {
          emit({
            step: 'login',
            message: 'OTP não concluído — tentando senha do protocolo (entrada Pardini)…',
            status: 'running',
          })
          loginResult = await runBrowserLogin(false, true)
        } else {
          throw browserErr
        }
      }
      const profile = await fetchHermesPardiniUserInfo(context.request, loginResult.tokens.accessToken)
      const session = buildHermesPardiniSession(
        login,
        loginResult.tokens.accessToken,
        loginResult.tokens.refreshToken,
        profile,
      )
      session.pacienteApiHeaders = loginResult.pedidosRequestHeaders

      const probeOk = await probeWithProfile(
        context.request,
        session.accessToken,
        session.pacienteApiHeaders,
      )
      if (!probeOk) {
        throw new Error(
          'Portal carregou, mas a API de resultados não aceitou o token — tente Sincronizar novamente',
        )
      }

      emit({
        step: 'login',
        message: profile.name
          ? `Conectado como ${profile.name}`
          : 'Login no portal — sessão capturada',
        status: 'success',
      })
      return session
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
   * 1. Sessão salva + probe API + refresh HTTP
   * 2. Browser OAuth PKCE — aguarda /pedidos OK antes de fechar o browser
   */
  async scrape(
    login: string,
    password: string,
    onProgress?: (p: ScraperProgress) => void,
    opts?: { sessionJson?: string; interactiveLogin?: boolean; examStartDate?: string },
  ): Promise<HermesPardiniSyncResult> {
    const emit = (step: string, message: string, status: ScraperProgress['status']) =>
      onProgress?.({ step, message, status })

    const fetchExamsWithSession = async (
      session: HermesPardiniSession,
      request: APIRequestContext,
    ) => {
      const startDate = opts?.examStartDate
      emit(
        'fetch-exams',
        startDate
          ? `Buscando resultados desde ${startDate}…`
          : 'Buscando resultados no Precision Care…',
        'running',
      )
      const fetchResult = await fetchHermesPardiniExams(request, session.accessToken, {
        startDate,
        headerProfile: session.pacienteApiHeaders,
      })
      emit(
        'fetch-exams',
        `${fetchResult.exams.length} exame(s) em ${fetchResult.pedidosCount} pedido(s)`,
        fetchResult.exams.length > 0 ? 'success' : 'running',
      )
      return fetchResult
    }

    emit('login', 'Autenticando no Hermes Pardini…', 'running')
    let session = await acquireHermesPardiniSession(
      login,
      password,
      (p) => onProgress?.(p),
      opts,
    )

    const request = await playwrightRequest.newContext()
    try {
      let fetchResult
      try {
        fetchResult = await fetchExamsWithSession(session, request)
      } catch (err) {
        if (!isTokenRejectedError(err)) throw err
        emit('login', 'Token rejeitado — novo login no portal…', 'running')
        session = await acquireHermesPardiniSession(
          login,
          password,
          (p) => onProgress?.(p),
          {
            interactiveLogin: opts?.interactiveLogin ?? true,
            forceFreshLogin: true,
          },
        )
        fetchResult = await fetchExamsWithSession(session, request)
      }

      const warnings = [...fetchResult.warnings]

      return {
        session,
        exams: fetchResult.exams,
        pedidosCount: fetchResult.pedidosCount,
        discoveredPath: '/pedidos',
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
    onProgress?: (p: ScraperProgress) => void,
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
