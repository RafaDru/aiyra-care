import type { Patient } from './api.types'

export const DASHBOARD_AGE_BAND_COLOR: Record<Patient['ageCategory'], string> = {
  children: '#0D9488',
  adolescents: '#E11D48',
  adults: '#4F46E5',
}

export const DASHBOARD_AGE_BAND_I18N: Record<Patient['ageCategory'], string> = {
  children: 'dashboard.ageBand.children',
  adolescents: 'dashboard.ageBand.adolescents',
  adults: 'dashboard.ageBand.adults',
}

export function patientAvatarColor(gender: Patient['gender'] | undefined): string {
  if (gender === 'female') return '#EC4899'
  return '#4F46E5'
}
