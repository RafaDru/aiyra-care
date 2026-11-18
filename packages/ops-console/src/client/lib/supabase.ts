import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const chSupabaseConfigured = Boolean(url?.trim() && anonKey?.trim())

let memoryAccessToken: string | null = null
let client: SupabaseClient | null = null

function buildClient(): SupabaseClient | null {
  if (!url?.trim() || !anonKey?.trim()) return null
  const supabase = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    memoryAccessToken = session?.access_token ?? null
  })
  return supabase
}

export function getChSupabase(): SupabaseClient | null {
  if (!client) client = buildClient()
  return client
}

export async function getChAccessToken(): Promise<string | null> {
  if (memoryAccessToken) return memoryAccessToken
  const supabase = getChSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token ?? null
  if (token) memoryAccessToken = token
  return token
}

export async function waitForChAccessToken(maxWaitMs = 8000): Promise<string | null> {
  const immediate = await getChAccessToken()
  if (immediate) return immediate
  const supabase = getChSupabase()
  if (!supabase) return null

  return new Promise((resolve) => {
    const deadline = Date.now() + maxWaitMs
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token ?? null
      if (token) {
        memoryAccessToken = token
        sub.subscription.unsubscribe()
        resolve(token)
      }
    })
    const poll = async () => {
      const token = await getChAccessToken()
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
  })
}

export function clearChAccessTokenMemory(): void {
  memoryAccessToken = null
}