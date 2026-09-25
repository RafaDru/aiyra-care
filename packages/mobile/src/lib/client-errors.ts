import { getAccessToken, supabaseConfigured } from '@/lib/supabase'

const DEDUPE_MS = 15_000
const recent = new Map<string, number>()

function shouldDedupe(key: string): boolean {
  const now = Date.now()
  const last = recent.get(key)
  if (last && now - last < DEDUPE_MS) return true
  recent.set(key, now)
  return false
}

/**
 * Telemetria ops — só envia com JWT (POST /telemetry/client-errors exige conta).
 * Falhas de cadastro **sem sessão** não aparecem no Command Hub (limitação atual da API).
 */
export async function reportAuthClientError(
  context: 'login' | 'signup' | 'google',
  errorCode: string,
): Promise<void> {
  if (!supabaseConfigured) return
  const token = await getAccessToken()
  if (!token) return
  const fingerprint = `mobile_auth_${context}_${errorCode.slice(0, 80)}`
  if (shouldDedupe(fingerprint)) return

  const base = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:3010'
  try {
    await fetch(`${base.replace(/\/$/, '')}/telemetry/client-errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        errors: [
          {
            fingerprint,
            feature: 'mobile_shell',
            errorKind: 'auth',
            errorCode: errorCode.slice(0, 200),
            sessionId: 'mobile',
            route: '/(auth)/login',
            properties: { auth_context: context },
          },
        ],
      }),
    })
  } catch {
    /* fire-and-forget */
  }
}
