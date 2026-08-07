import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const REMEMBER_ME_KEY = 'openhealth-remember-me'

if (!url || !anonKey) {
  console.warn('[auth] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados — login desativado')
}

export const supabaseConfigured = Boolean(url && anonKey)

export function isRememberMeEnabled(): boolean {
  return localStorage.getItem(REMEMBER_ME_KEY) !== '0'
}

export function setRememberMePreference(remember: boolean): void {
  localStorage.setItem(REMEMBER_ME_KEY, remember ? '1' : '0')
}

/** sessionStorage = só nesta sessão do browser; localStorage = manter conectado. */
const hybridAuthStorage = {
  getItem(key: string): string | null {
    const primary = isRememberMeEnabled() ? localStorage : sessionStorage
    const fallback = isRememberMeEnabled() ? sessionStorage : localStorage
    return primary.getItem(key) ?? fallback.getItem(key)
  },
  setItem(key: string, value: string): void {
    const primary = isRememberMeEnabled() ? localStorage : sessionStorage
    const other = isRememberMeEnabled() ? sessionStorage : localStorage
    primary.setItem(key, value)
    other.removeItem(key)
  },
  removeItem(key: string): void {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

function buildClient(): SupabaseClient | null {
  if (!url || !anonKey) return null
  return createClient(url, anonKey, {
    auth: {
      storage: hybridAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

export let supabase: SupabaseClient | null = buildClient()

export function getSupabase(): SupabaseClient | null {
  return supabase
}

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
