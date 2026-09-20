import Constants from 'expo-constants'

const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined

export function webAppBaseUrl(): string {
  const raw =
    process.env.EXPO_PUBLIC_WEB_APP_URL ??
    extra?.webAppUrl ??
    'http://localhost:5173'
  return raw.replace(/\/$/, '')
}

export function webPatientPlanTabUrl(patientId: string, tab: 'wallet' | 'coverage' | 'integrations'): string {
  const base = webAppBaseUrl()
  const params = new URLSearchParams({ section: 'plan', tab })
  return `${base}/patients/${encodeURIComponent(patientId)}?${params.toString()}`
}
