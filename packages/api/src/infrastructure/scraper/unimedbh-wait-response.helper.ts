import type { Page, Response } from 'playwright'

/**
 * Aguarda POST OutSystems ScreenServices (ex.: DataActionListarExtratoUtilizacao).
 * Em timeout, inclui URL da página e respostas POST parciais para diagnóstico.
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
  try {
    return await page.waitForResponse(
      (r) => r.url().includes(pathPart) && r.request().method() === 'POST' && r.ok(),
      { timeout },
    )
  } catch (err) {
    const pageUrl = page.url()
    const hint = attempts.length
      ? `POST "${pathPart}": ${attempts.map((a) => `${a.status} ${a.url}`).join('; ')}`
      : `sem POST para "${pathPart}"`
    const base = err instanceof Error ? err.message : String(err)
    throw new Error(`${base} | página=${pageUrl} | ${hint}`)
  } finally {
    page.off('response', onResponse)
  }
}
