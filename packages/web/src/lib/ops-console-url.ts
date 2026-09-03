/** URL do console de observabilidade (processo independente do app Aiyra). */
export function getOpsConsoleUrl(): string {
  const fromEnv = import.meta.env.VITE_OPS_CONSOLE_URL as string | undefined
  if (fromEnv?.trim()) return fromEnv.trim().replace(/\/$/, '')
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? ''
  if (apiUrl.includes(':3020')) return 'http://127.0.0.1:3023'
  return 'http://127.0.0.1:3013'
}

export function openOpsConsole(): void {
  window.open(getOpsConsoleUrl(), '_blank', 'noopener,noreferrer')
}
