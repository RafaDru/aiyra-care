import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  chSupabaseConfigured,
  clearChAccessTokenMemory,
  getChSupabase,
  waitForChAccessToken,
} from '../lib/supabase.js'

export type ChAuthStatus = {
  enabled: boolean
  supabaseConfigured: boolean
  allowlistConfigured: boolean
}

type ChOperatorAuthContextValue = {
  loading: boolean
  status: ChAuthStatus | null
  session: Session | null
  operatorEmail: string | null
  authError: string | null
  signInWithOtp: (email: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  retrySession: () => Promise<void>
}

const ChOperatorAuthContext = createContext<ChOperatorAuthContextValue | null>(null)

async function fetchAuthStatus(): Promise<ChAuthStatus> {
  const res = await fetch('/api/auth/status')
  if (!res.ok) throw new Error('Falha ao carregar status de autenticação do CH')
  return res.json() as Promise<ChAuthStatus>
}

async function validateOperatorSession(accessToken: string): Promise<string> {
  const res = await fetch('/api/auth/session', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string; code?: string }
    if (body.code === 'OPS_CONSOLE_OPERATOR_DENIED') {
      throw new Error('Esta conta não está na lista de operadores do Command Hub.')
    }
    throw new Error(body.message ?? 'Sessão inválida')
  }
  const body = (await res.json()) as { email?: string }
  if (!body.email) throw new Error('Sessão inválida')
  return body.email
}

export function ChOperatorAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<ChAuthStatus | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [operatorEmail, setOperatorEmail] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const bootstrap = useCallback(async () => {
    setAuthError(null)
    const nextStatus = await fetchAuthStatus()
    setStatus(nextStatus)
    if (!nextStatus.enabled) {
      setSession(null)
      setOperatorEmail(null)
      setLoading(false)
      return
    }
    if (!chSupabaseConfigured) {
      setAuthError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente do CH.')
      setLoading(false)
      return
    }
    const token = await waitForChAccessToken()
    if (!token) {
      setSession(null)
      setOperatorEmail(null)
      setLoading(false)
      return
    }
    const client = getChSupabase()
    const { data } = await client!.auth.getSession()
    try {
      const email = await validateOperatorSession(token)
      setSession(data.session)
      setOperatorEmail(email)
    } catch (err) {
      setSession(null)
      setOperatorEmail(null)
      setAuthError(err instanceof Error ? err.message : 'Falha na autenticação')
      await client?.auth.signOut()
      clearChAccessTokenMemory()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    bootstrap().catch((err) => {
      setAuthError(err instanceof Error ? err.message : 'Falha ao iniciar autenticação')
      setLoading(false)
    })
  }, [bootstrap])

  useEffect(() => {
    const client = getChSupabase()
    if (!client || !status?.enabled) return
    const { data: sub } = client.auth.onAuthStateChange(async (_event, next) => {
      if (!next?.access_token) {
        setSession(null)
        setOperatorEmail(null)
        clearChAccessTokenMemory()
        return
      }
      try {
        const email = await validateOperatorSession(next.access_token)
        setSession(next)
        setOperatorEmail(email)
        setAuthError(null)
      } catch (err) {
        setSession(null)
        setOperatorEmail(null)
        setAuthError(err instanceof Error ? err.message : 'Conta não autorizada')
        await client.auth.signOut()
        clearChAccessTokenMemory()
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [status?.enabled])

  const signInWithOtp = useCallback(async (email: string) => {
    const client = getChSupabase()
    if (!client) throw new Error('Supabase não configurado no CH')
    const redirectTo = `${window.location.origin}${window.location.pathname}`
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    })
    if (error) throw error
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const client = getChSupabase()
    if (!client) throw new Error('Supabase não configurado no CH')
    const redirectTo = `${window.location.origin}${window.location.pathname}`
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const client = getChSupabase()
    await client?.auth.signOut()
    clearChAccessTokenMemory()
    setSession(null)
    setOperatorEmail(null)
  }, [])

  const value = useMemo<ChOperatorAuthContextValue>(
    () => ({
      loading,
      status,
      session,
      operatorEmail,
      authError,
      signInWithOtp,
      signInWithGoogle,
      signOut,
      retrySession: bootstrap,
    }),
    [
      loading,
      status,
      session,
      operatorEmail,
      authError,
      signInWithOtp,
      signInWithGoogle,
      signOut,
      bootstrap,
    ],
  )

  return <ChOperatorAuthContext.Provider value={value}>{children}</ChOperatorAuthContext.Provider>
}

export function useChOperatorAuth(): ChOperatorAuthContextValue {
  const ctx = useContext(ChOperatorAuthContext)
  if (!ctx) throw new Error('useChOperatorAuth must be used within ChOperatorAuthProvider')
  return ctx
}