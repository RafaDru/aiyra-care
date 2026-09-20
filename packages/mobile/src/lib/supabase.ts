import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra?.supabaseUrl
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra?.supabaseAnonKey

export const supabaseConfigured = Boolean(url && anonKey)

let memoryAccessToken: string | null = null

function buildClient(): SupabaseClient | null {
  if (!url || !anonKey) return null
  const client = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: typeof window !== 'undefined',
    },
  })
  client.auth.onAuthStateChange((_event, session) => {
    memoryAccessToken = session?.access_token ?? null
  })
  return client
}

export let supabase: SupabaseClient | null = buildClient()

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

export async function ensureAccessToken(): Promise<string | null> {
  const token = await getAccessToken()
  if (token) return token
  if (!supabase) return null
  const { data } = await supabase.auth.refreshSession()
  memoryAccessToken = data.session?.access_token ?? null
  return memoryAccessToken
}
