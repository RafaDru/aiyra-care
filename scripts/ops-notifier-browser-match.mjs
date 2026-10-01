/**
 * Pure URL helpers for ops notifier browser dedup (Windows tray + headless).
 */

const OPS_CONSOLE_PORTS = new Set([3013, 3023])

/**
 * @param {string} url
 * @returns {{ host: string, port: number, isOpsConsole: boolean } | null}
 */
export function parseLocalServiceUrl(url) {
  if (!url || typeof url !== 'string') return null
  let raw = url.trim()
  if (!raw) return null
  if (!/^https?:\/\//i.test(raw)) raw = `http://${raw}`
  try {
    const u = new URL(raw)
    const host = u.hostname.toLowerCase()
    if (host !== '127.0.0.1' && host !== 'localhost' && !host.endsWith('.aiyracare.test')) {
      return null
    }
    const port = u.port ? Number(u.port) : (u.protocol === 'https:' ? 443 : 80)
    return {
      host,
      port,
      isOpsConsole: OPS_CONSOLE_PORTS.has(port),
    }
  } catch {
    return null
  }
}

/** Needles for matching browser window titles / process command lines on Windows. */
export function buildBrowserMatchNeedles(url) {
  const parsed = parseLocalServiceUrl(url)
  if (!parsed) return { titleNeedles: [], commandNeedles: [] }
  const { host, port, isOpsConsole } = parsed
  const commandNeedles = [
    `${host}:${port}`,
    `127.0.0.1:${port}`,
    `localhost:${port}`,
    `:${port}/`,
    `:${port}?`,
  ]
  const titleNeedles = [`:${port}`, `${host}:${port}`]
  if (isOpsConsole) titleNeedles.push('Observabilidade')
  return { titleNeedles, commandNeedles, isOpsConsole }
}
