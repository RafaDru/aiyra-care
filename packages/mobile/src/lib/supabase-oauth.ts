import * as QueryParams from 'expo-auth-session/build/QueryParams'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { getSupabase } from '@/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

export function getSupabaseOAuthRedirectUri(): string {
  const explicit = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI?.trim()
  if (explicit) return explicit
  const webBase = process.env.EXPO_PUBLIC_WEB_APP_URL?.replace(/\/$/, '')
  if (webBase) return `${webBase}/mobile-oauth-return`
  return makeRedirectUri({
    scheme: 'aiyracare',
    path: 'auth/callback',
  })
}

/** Troca tokens do redirect Supabase OAuth por sessão persistida (AsyncStorage). */
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
  if (__DEV__) {
    console.log('[Aiyra OAuth] getSupabaseOAuthRedirectUri() =>', redirectTo)
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

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  if (__DEV__) {
    const safeUrl =
      result.type === 'success' && result.url
        ? result.url.replace(/#.*$/, '#…')
        : undefined
    console.log('[Aiyra OAuth] WebBrowser result', result.type, safeUrl ?? '')
  }
  if (result.type === 'success' && result.url) {
    await createSessionFromOAuthUrl(result.url)
    return
  }
  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Login cancelado')
  }
}
