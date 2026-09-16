/** Chave de feature para telemetria — espelha deriveFeatureKeyFromRoute na API. */
export function resolveScreenFeatureKey(pathname: string): string | null {
  const path = pathname.split('?')[0].replace(/\/+$/, '') || '/'
  if (path === '/' || path === '') return 'dashboard'
  if (path.startsWith('/patients/') && path.includes('/context')) return 'patient_context'
  if (path.startsWith('/patients/')) return 'patient_detail'
  if (path.startsWith('/integrations')) return 'integrations'
  if (path.startsWith('/settings/family')) return 'settings_family'
  if (path.startsWith('/settings/plan')) return 'billing'
  if (path.startsWith('/settings')) return 'settings'
  if (path.startsWith('/invite/accept')) return 'family_invite'
  if (path.startsWith('/compliance')) return 'compliance'
  if (path.startsWith('/onboarding')) return 'onboarding'
  if (path.startsWith('/emergency')) return 'emergency'
  if (path.startsWith('/roadmap')) return 'roadmap'
  return null
}
