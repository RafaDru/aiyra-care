export const COOKIE_CONSENT_STORAGE_KEY = 'aiyracare_cookie_consent'
export const COOKIE_CONSENT_VERSION = '1.0'

export function hasCookieConsent(): boolean {
  try {
    return localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) === COOKIE_CONSENT_VERSION
  } catch {
    return false
  }
}

export function setCookieConsent(): void {
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, COOKIE_CONSENT_VERSION)
  } catch {
    // ignore
  }
}
