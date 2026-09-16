const SESSION_KEY = 'aiyracare.browser_session'

export function getBrowserSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, '').slice(0, 32)
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return 'anonymous'
  }
}

export function inferPatientIdFromRoute(pathname: string): string | undefined {
  const match = pathname.match(/^\/patients\/([0-9a-f-]{36})/i)
  return match?.[1]
}

export function buildSupportClientContext(): Record<string, unknown> {
  return {
    locale: navigator.language?.slice(0, 128),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    theme: document.documentElement.getAttribute('data-theme') ?? 'default',
  }
}
