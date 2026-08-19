import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { AppAccount } from '../lib/api.types.js'
import {
  getSupabase,
  isRememberMeEnabled,
  setMemoryAccessToken,
  setRememberMePreference,
  supabaseConfigured,
} from '../lib/supabase.js'

type AuthContextValue = {
  configured: boolean
  loading: boolean
  syncing: boolean
  session: Session | null
  /** Estável para effects de carga de dados (não muda em TOKEN_REFRESHED). */
  authUserId: string | null
  user: User | null
  account: AppAccount | null
  needsProfile: boolean
  rememberMe: boolean
  setRememberMe: (remember: boolean) => void
  refreshSync: () => Promise<void>
  signInWithGoogle: (remember?: boolean) => Promise<void>
  signInWithMicrosoft: (remember?: boolean) => Promise<void>
  signInWithPassword: (email: string, password: string, remember?: boolean) => Promise<void>
  signUpWithPassword: (email: string, password: string, remember?: boolean) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function applyRememberMe(remember: boolean) {
  setRememberMePreference(remember)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [account, setAccount] = useState<AppAccount | null>(null)
  const [needsProfile, setNeedsProfile] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [rememberMe, setRememberMeState] = useState(isRememberMeEnabled())

  const syncAccount = useCallback(async (accessToken: string | undefined) => {
    if (!accessToken || !supabaseConfigured) {
      setAccount(null)
      setNeedsProfile(false)
      return
    }
    const { api } = await import('../lib/api.js')
    const result = await api.auth.sync()
    setAccount(result.account)
    setNeedsProfile(result.needsProfile)
  }, [])

  const runSync = useCallback(async (accessToken: string | undefined) => {
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
  }, [syncAccount])

  const refreshSync = useCallback(async () => {
    await runSync(session?.access_token)
  }, [session?.access_token, runSync])

  useEffect(() => {
    const client = getSupabase()
    if (!client) {
      setLoading(false)
      return
    }

    let initialResolved = false

    const resolveInitial = async (next: Session | null, source: 'initial' | 'getSession' | 'timeout') => {
      if (initialResolved) return
      if (source === 'getSession' && !next) return
      initialResolved = true
      setSession(next)
      setMemoryAccessToken(next?.access_token ?? null)
      await runSync(next?.access_token)
      setLoading(false)
    }

    const { data: sub } = client.auth.onAuthStateChange(async (event, next) => {
      if (event === 'INITIAL_SESSION') {
        if (!next) return
        await resolveInitial(next, 'initial')
        return
      }
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setMemoryAccessToken(null)
        setAccount(null)
        setNeedsProfile(false)
        return
      }
      if (event === 'TOKEN_REFRESHED') {
        setMemoryAccessToken(next?.access_token ?? null)
        setSession(next)
        return
      }
      setSession(next)
      setMemoryAccessToken(next?.access_token ?? null)
      await runSync(next?.access_token)
    })

    client.auth.getSession().then(async ({ data }) => {
      await resolveInitial(data.session, 'getSession')
    })

    const timeoutId = window.setTimeout(() => {
      void client.auth.getSession().then(async ({ data }) => {
        await resolveInitial(data.session ?? null, 'timeout')
      })
    }, 3000)

    return () => {
      window.clearTimeout(timeoutId)
      sub.subscription.unsubscribe()
    }
  }, [runSync])

  const value = useMemo<AuthContextValue>(() => ({
    configured: supabaseConfigured,
    loading,
    syncing,
    session,
    authUserId: session?.user?.id ?? null,
    user: session?.user ?? null,
    account,
    needsProfile,
    rememberMe,
    setRememberMe: (remember: boolean) => {
      setRememberMeState(remember)
      applyRememberMe(remember)
    },
    refreshSync,
    signInWithGoogle: async (remember = rememberMe) => {
      const client = getSupabase()
      if (!client) throw new Error('Supabase não configurado')
      applyRememberMe(remember)
      setRememberMeState(remember)
      const redirectTo = `${window.location.origin}/`
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) throw error
    },
    signInWithMicrosoft: async (remember = rememberMe) => {
      const client = getSupabase()
      if (!client) throw new Error('Supabase não configurado')
      applyRememberMe(remember)
      setRememberMeState(remember)
      const redirectTo = `${window.location.origin}/`
      const { error } = await client.auth.signInWithOAuth({
        provider: 'azure',
        options: { redirectTo, scopes: 'email' },
      })
      if (error) throw error
    },
    signInWithPassword: async (email, password, remember = rememberMe) => {
      const client = getSupabase()
      if (!client) throw new Error('Supabase não configurado')
      applyRememberMe(remember)
      setRememberMeState(remember)
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    signUpWithPassword: async (email, password, remember = rememberMe) => {
      const client = getSupabase()
      if (!client) throw new Error('Supabase não configurado')
      applyRememberMe(remember)
      setRememberMeState(remember)
      const { error } = await client.auth.signUp({ email, password })
      if (error) throw error
    },
    signOut: async () => {
      const client = getSupabase()
      if (!client) return
      await client.auth.signOut({ scope: 'local' })
      setSession(null)
      setMemoryAccessToken(null)
      setAccount(null)
      setNeedsProfile(false)
      window.location.assign('/login')
    },
  }), [loading, syncing, session, account, needsProfile, rememberMe, refreshSync])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
