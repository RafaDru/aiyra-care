/** Chaves de persistência cliente — marca Ananeri; leitura compatível com legado `aiyra-care-*`. */

export const LANG_STORAGE_KEY = 'ananeri-lang'
const LANG_STORAGE_KEY_LEGACY = 'aiyra-care-lang'

export const REMEMBER_ME_STORAGE_KEY = 'ananeri-remember-me'
const REMEMBER_ME_STORAGE_KEY_LEGACY = 'aiyra-care-remember-me'

export function readLanguagePreference(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(LANG_STORAGE_KEY) ?? localStorage.getItem(LANG_STORAGE_KEY_LEGACY)
}

export function writeLanguagePreference(lang: string): void {
  localStorage.setItem(LANG_STORAGE_KEY, lang)
  localStorage.removeItem(LANG_STORAGE_KEY_LEGACY)
}

export function readRememberMePreference(): string | null {
  if (typeof localStorage === 'undefined') return null
  return (
    localStorage.getItem(REMEMBER_ME_STORAGE_KEY) ??
    localStorage.getItem(REMEMBER_ME_STORAGE_KEY_LEGACY)
  )
}

export function writeRememberMePreference(value: string): void {
  localStorage.setItem(REMEMBER_ME_STORAGE_KEY, value)
  localStorage.removeItem(REMEMBER_ME_STORAGE_KEY_LEGACY)
}