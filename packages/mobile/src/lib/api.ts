import Constants from 'expo-constants'
import type { AuthSyncResponse, Patient } from './api.types'
import { ensureAccessToken, supabaseConfigured } from './supabase'

const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  extra?.apiUrl ??
  'http://127.0.0.1:3010'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> =
    options?.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}
  const token = await ensureAccessToken()
  if (supabaseConfigured && !token) {
    throw new Error('Sessão não disponível — faça login novamente')
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { ...headers, ...options?.headers },
      ...options,
    })
  } catch {
    throw new Error('Sem conexão com o servidor')
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const body = (await res.json().catch(() => ({}))) as { message?: string }
      throw new Error(body.message || `HTTP ${res.status}`)
    }
    throw new Error(`HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  if (!contentType.includes('application/json')) {
    throw new Error('Resposta inválida da API')
  }
  return res.json() as Promise<T>
}

export const api = {
  patients: {
    list: () => request<Patient[]>('/patients'),
    get: (id: string) => request<Patient>(`/patients/${id}`),
  },
  auth: {
    sync: () => request<AuthSyncResponse>('/auth/sync', { method: 'POST' }),
  },
}

export { BASE_URL }
