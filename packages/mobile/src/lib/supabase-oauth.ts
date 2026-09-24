import * as QueryParams from 'expo-auth-session/build/QueryParams'
import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'
import { getSupabaseOAuthRedirectUri, isLoopbackWebUrl } from '@/lib/oauth-redirect-url'
import { getSupabase } from '@/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

export { getSupabaseOAuthRedirectUri } from '@/lib/oauth-redirect-url'

/** Troca tokens do redirect Supabase OAuth por sessão persistida (AsyncStorage). */
async function hasPersistedSession(): Promise<boolean> {
  const client = getSupabase()
  if (!client) return false
  const { data } = await client.auth.getSession()
  return Boolean(data.session?.access_token)
}

/** Aguarda sessão após deep link (bridge exp:// pode fechar o Custom Tab antes do `success`). */
async function waitForOAuthSession(maxMs = 4000): Promise<boolean> {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    if (await hasPersistedSession()) return true
    await new Promise((r) => setTimeout(r, 120))
  }
  return hasPersistedSession()
}

export async function createSessionFromOAuthUrl(url: string): Promise<void> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase não configurado')

  const { params, errorCode } = QueryParams.getQueryParams(url)
  if (errorCode) throw new Error(errorCode)
  if (params.error_description) {
    throw new Error(String(params.error_description))
  }

  const access_token = params.access_token as string | undefined
  const refresh_token = params.refresh_token as string | undefined
  if (access_token && refresh_token) {
    const { error } = await client.auth.setSession({ access_token, refresh_token })
    if (error) throw error
    return
  }

  const code = params.code as string | undefined
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code)
    if (error) throw error
  }
}

export async function signInWithOAuthProvider(provider: 'google'): Promise<void> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase não configurado')

  const redirectTo = getSupabaseOAuthRedirectUri()
  console.log('[Aiyra OAuth] redirectTo (signInWithOAuth)', redirectTo)
  if (Platform.OS !== 'web' && isLoopbackWebUrl(redirectTo)) {
    console.warn(
      '[Aiyra OAuth] redirectTo usa loopback no dispositivo — ajuste EXPO_PUBLIC_* ou use npm run mobile:lan',
    )
  }
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })
  if (error) throw error
  if (!data?.url) throw new Error('URL de login não retornada')

  console.log('[Aiyra OAuth] authorize URL', data.url)

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  const safeResultUrl =
    result.type === 'success' && result.url
      ? result.url.replace(/#.*$/, '#…').replace(/\?.*$/, '?…')
      : ''
  console.log('[Aiyra OAuth] WebBrowser result', result.type, safeResultUrl)
  if (result.type !== 'success' && result.type !== 'cancel' && result.type !== 'dismiss') {
    console.log('[Aiyra OAuth] WebBrowser raw', JSON.stringify(result))
  }
  if (result.type === 'success' && result.url) {
    await createSessionFromOAuthUrl(result.url)
    return
  }
  if (result.type === 'cancel' || result.type === 'dismiss') {
    if (await waitForOAuthSession()) {
      console.log('[Aiyra OAuth] sessão OK após WebBrowser', result.type)
      return
    }
    throw new Error('Login cancelado')
  }
  if (await waitForOAuthSession(2000)) {
    console.log('[Aiyra OAuth] sessão OK após WebBrowser tipo', result.type)
    return
  }
}
