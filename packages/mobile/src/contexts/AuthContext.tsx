import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Linking } from 'react-native'
import type { Session, User } from '@supabase/supabase-js'
import type { AppAccount } from '@/lib/api.types'
import { api } from '@/lib/api'
import { createSessionFromOAuthUrl, signInWithOAuthProvider } from '@/lib/supabase-oauth'
import { getAccessToken, getSupabase, setMemoryAccessToken, supabaseConfigured } from '@/lib/supabase'

export type SignUpResult = { kind: 'session' } | { kind: 'email_confirmation' }

type AuthContextValue = {
  configured: boolean
  loading: boolean
  syncing: boolean
  session: Session | null
  /** Estável para effects de carga (espelho web). */
  authUserId: string | null
  user: User | null
  account: AppAccount | null
  needsProfile: boolean
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (email: string, password: string) => Promise<SignUpResult>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshSync: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [account, setAccount] = useState<AppAccount | null>(null)
  const [needsProfile, setNeedsProfile] = useState(false)

  const authUserId = session?.user?.id ?? null

  const syncAccount = useCallback(async (accessToken: string | undefined) => {
    if (!accessToken || !supabaseConfigured) {
      setAccount(null)
      setNeedsProfile(false)
      return
    }
    const result = await api.auth.sync()
    setAccount(result.account)
    setNeedsProfile(result.needsProfile)
  }, [])

  const runSync = useCallback(
    async (accessToken: string | undefined) => {
      if (!supabaseConfigured) return
      setSyncing(true)
      try {
        await syncAccount(accessToken)
      } catch {
        setAccount(null)
        setNeedsProfile(false)
      } finally {
        setSyncing(false)
      }
    },
    [syncAccount],
  )

  const refreshSync = useCallback(async () => {
    const token = (await getAccessToken()) ?? session?.access_token
    await runSync(token)
  }, [session?.access_token, runSync])

  useEffect(() => {
    const client = getSupabase()
    if (!client) {
      setLoading(false)
      return
    }
    client.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session)
        return runSync(data.session?.access_token)
      })
      .finally(() => setLoading(false))

    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      void runSync(next?.access_token)
    })
    return () => sub.subscription.unsubscribe()
  }, [runSync])

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return
      if (!url.includes('access_token') && !url.includes('code=') && !url.includes('error=')) return
      void createSessionFromOAuthUrl(url).catch(() => undefined)
    }
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url))
    void Linking.getInitialURL().then(handleUrl)
    return () => sub.remove()
  }, [])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const client = getSupabase()
    if (!client) throw new Error('Auth não configurado')
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUpWithPassword = useCallback(async (email: string, password: string): Promise<SignUpResult> => {
    const client = getSupabase()
    if (!client) throw new Error('Auth não configurado')
    const { data, error } = await client.auth.signUp({ email, password })
    if (error) throw error
    if (data.session) {
      setMemoryAccessToken(data.session.access_token)
      setSession(data.session)
      return { kind: 'session' }
    }
    return { kind: 'email_confirmation' }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await signInWithOAuthProvider('google')
  }, [])

  const signOut = useCallback(async () => {
    const client = getSupabase()
    if (!client) return
    await client.auth.signOut()
    setAccount(null)
    setNeedsProfile(false)
  }, [])

  const value = useMemo(
    (): AuthContextValue => ({
      configured: supabaseConfigured,
      loading,
      syncing,
      session,
      authUserId,
      user: session?.user ?? null,
      account,
      needsProfile,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      signOut,
      refreshSync,
    }),
    [
      loading,
      syncing,
      session,
      authUserId,
      account,
      needsProfile,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      signOut,
      refreshSync,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
