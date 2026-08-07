import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { spawn } from 'child_process'

export function cdpPort(endpoint: string): string {
  try {
    return new URL(endpoint).port || '9222'
  } catch {
    return '9222'
  }
}

export async function isCdpReady(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/json/version`, {
      signal: AbortSignal.timeout(2000),
    })
    return res.ok
  } catch {
    return false
  }
}

export function resolveChromeExecutable(): string {
  const candidates = [
    process.env.AMIL_CHROME_PATH?.trim(),
    process.env.MATER_DEI_CHROME_PATH?.trim(),
    join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean) as string[]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  throw new Error('Google Chrome não encontrado. Instale o Chrome ou defina AMIL_CHROME_PATH.')
}

export function cdpProfileDir(name: string): string {
  const dir = join(process.cwd(), '.cache', name)
  mkdirSync(dir, { recursive: true })
  return dir
}

/** Garante Chrome real escutando na porta CDP (como no sync Amil). */
export async function ensureCdpChromeRunning(
  endpoint: string,
  opts: { profileDirName: string; startUrl: string },
): Promise<void> {
  if (await isCdpReady(endpoint)) return

  const chrome = resolveChromeExecutable()
  const port = cdpPort(endpoint)
  spawn(chrome, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${cdpProfileDir(opts.profileDirName)}`,
    opts.startUrl,
  ], { detached: true, stdio: 'ignore' }).unref()

  const deadline = Date.now() + 25_000
  while (Date.now() < deadline) {
    if (await isCdpReady(endpoint)) return
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('Chrome não respondeu na porta de debug (9222)')
}
