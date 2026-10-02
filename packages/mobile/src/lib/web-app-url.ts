import Constants from 'expo-constants'
import { deviceWebAppBaseUrl } from '@/lib/oauth-redirect-url'

const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined

export function webAppBaseUrl(): string {
  const fromEnv = deviceWebAppBaseUrl()
  const raw = fromEnv ?? process.env.EXPO_PUBLIC_WEB_APP_URL ?? extra?.webAppUrl ?? 'http://localhost:5173'
  return raw.replace(/\/$/, '')
}

export function webPatientPlanTabUrl(patientId: string, tab: 'wallet' | 'coverage' | 'integrations'): string {
  return webPatientSectionTabUrl(patientId, 'plan', tab)
}

export function webPatientSectionTabUrl(
  patientId: string,
  section: 'overview' | 'clinical' | 'plan' | 'files',
  tab: string,
): string {
  const base = webAppBaseUrl()
  const params = new URLSearchParams({ section, tab })
  return `${base}/patients/${encodeURIComponent(patientId)}?${params.toString()}`
}
