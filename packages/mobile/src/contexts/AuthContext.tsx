import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { AppAccount } from '@/lib/api.types'
import { api } from '@/lib/api'
import { getSupabase, supabaseConfigured } from '@/lib/supabase'

type AuthContextValue = {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  account: AppAccount | null
  needsProfile: boolean
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSync: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [account, setAccount] = useState<AppAccount | null>(null)
  const [needsProfile, setNeedsProfile] = useState(false)

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

  const refreshSync = useCallback(async () => {
    await syncAccount(session?.access_token)
  }, [session?.access_token, syncAccount])

  useEffect(() => {
    const client = getSupabase()
    if (!client) {
      setLoading(false)
      return
    }
    client.auth.getSession().then(({ data }) => {
      setSession(data.session)
      return syncAccount(data.session?.access_token)
    }).finally(() => setLoading(false))

    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      void syncAccount(next?.access_token)
    })
    return () => sub.subscription.unsubscribe()
  }, [syncAccount])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const client = getSupabase()
    if (!client) throw new Error('Auth não configurado')
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
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
      session,
      user: session?.user ?? null,
      account,
      needsProfile,
      signInWithPassword,
      signOut,
      refreshSync,
    }),
    [loading, session, account, needsProfile, signInWithPassword, signOut, refreshSync],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
