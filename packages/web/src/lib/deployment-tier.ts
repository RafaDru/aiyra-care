export type WebDeploymentTier = 'integration' | 'preview' | 'production'

export function resolveWebDeploymentTier(): WebDeploymentTier | null {
  const explicit = (import.meta.env.VITE_DEPLOYMENT_TIER as string | undefined)?.trim().toLowerCase()
  if (explicit === 'preview' || explicit === 'staging') return 'preview'
  if (explicit === 'production' || explicit === 'prod') return 'production'
  if (explicit === 'integration' || explicit === 'dev') return 'integration'

  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? ''
  if (apiUrl.includes(':3020')) return 'preview'
  if (apiUrl.includes(':3010')) return 'integration'

  if (typeof window !== 'undefined') {
    const port = window.location.port
    if (port === '5174') return 'preview'
    if (port === '5173') return 'integration'
  }

  if (import.meta.env.PROD) return 'production'
  if (import.meta.env.DEV) return 'integration'

  return null
}

export function shouldShowWebDeploymentBadge(tier: WebDeploymentTier | null): boolean {
  return tier === 'integration' || tier === 'preview'
}
