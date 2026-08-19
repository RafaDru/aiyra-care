import type { Page, Response } from 'playwright'
import { isUnimedLoginPage, unimedSessionExpiredMessage } from './unimedbh-login.helper.js'

/**
 * Aguarda POST OutSystems ScreenServices (ex.: DataActionListarExtratoUtilizacao).
 * Em timeout, inclui URL da página e respostas POST parciais para diagnóstico.
 * Falha rápido se o portal redireciona ao SSO (sessão expirada).
 */
export async function waitForUnimedScreenService(
  page: Page,
  pathPart: string,
  timeout = 45000,
): Promise<Response> {
  const attempts: { url: string; status: number }[] = []
  const onResponse = (r: Response) => {
    if (r.url().includes(pathPart) && r.request().method() === 'POST') {
      attempts.push({ url: r.url(), status: r.status() })
    }
  }
  page.on('response', onResponse)

  let loginWatchDone = false
  let loginTimer: ReturnType<typeof setTimeout> | undefined
  const stopLoginWatch = () => {
    loginWatchDone = true
    if (loginTimer !== undefined) clearTimeout(loginTimer)
  }
  const loginWatch = new Promise<never>((_, reject) => {
    const tick = () => {
      if (loginWatchDone) return
      if (isUnimedLoginPage(page.url())) {
        stopLoginWatch()
        reject(new Error(unimedSessionExpiredMessage(page.url())))
        return
      }
      loginTimer = setTimeout(tick, 400)
    }
    tick()
  })

  try {
    const res = await Promise.race([
      page.waitForResponse(
        (r) => r.url().includes(pathPart) && r.request().method() === 'POST' && r.ok(),
        { timeout },
      ),
      loginWatch,
    ])
    stopLoginWatch()
    return res
  } catch (err) {
    const pageUrl = page.url()
    const hint = attempts.length
      ? `POST "${pathPart}": ${attempts.map((a) => `${a.status} ${a.url}`).join('; ')}`
      : `sem POST para "${pathPart}"`
    const base = err instanceof Error ? err.message : String(err)
    throw new Error(`${base} | página=${pageUrl} | ${hint}`)
  } finally {
    stopLoginWatch()
    page.off('response', onResponse)
  }
}
