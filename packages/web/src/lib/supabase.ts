import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const REMEMBER_ME_KEY = 'aiyra-care-remember-me'

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

/** Token em memória — evita race entre React state e getSession após hard refresh. */
let memoryAccessToken: string | null = null

function buildClient(): SupabaseClient | null {
  if (!url || !anonKey) return null
  const client = createClient(url, anonKey, {
    auth: {
      storage: hybridAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
  client.auth.onAuthStateChange((_event, session) => {
    memoryAccessToken = session?.access_token ?? null
  })
  return client
}

export let supabase: SupabaseClient | null = buildClient()

export function setMemoryAccessToken(token: string | null): void {
  memoryAccessToken = token
}

export function getSupabase(): SupabaseClient | null {
  return supabase
}

export async function getAccessToken(): Promise<string | null> {
  if (memoryAccessToken) return memoryAccessToken
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token ?? null
  if (token) memoryAccessToken = token
  return token
}

/** Aguarda hidratação da sessão após hard refresh (evita 401 Token ausente). */
export async function waitForAccessToken(maxWaitMs = 8000): Promise<string | null> {
  const immediate = await getAccessToken()
  if (immediate) return immediate
  if (!supabase) return null

  return new Promise((resolve) => {
    const deadline = Date.now() + maxWaitMs
    const { data: sub } = supabase!.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token ?? null
      if (token) {
        memoryAccessToken = token
        sub.subscription.unsubscribe()
        resolve(token)
      }
    })

    const poll = async () => {
      const token = await getAccessToken()
      if (token) {
        sub.subscription.unsubscribe()
        resolve(token)
        return
      }
      if (Date.now() >= deadline) {
        sub.subscription.unsubscribe()
        resolve(null)
        return
      }
      setTimeout(poll, 50)
    }
    poll()
  })
}

/** Garante token antes de chamar a API quando Supabase está configurado. */
export async function ensureAccessToken(): Promise<string | null> {
  if (!supabaseConfigured) return null
  return waitForAccessToken()
}
