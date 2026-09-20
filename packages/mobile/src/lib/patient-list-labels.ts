import type { Patient } from './api.types'

export const AGE_CATEGORY_LABEL: Record<Patient['ageCategory'], string> = {
  children: 'Crianças',
  adolescents: 'Adolescentes',
  adults: 'Adultos',
}

export const AGE_CATEGORY_ORDER: Patient['ageCategory'][] = ['adults', 'adolescents', 'children']

export function groupPatientsByAgeCategory(patients: Patient[]): Array<{ key: Patient['ageCategory']; label: string; items: Patient[] }> {
  return AGE_CATEGORY_ORDER.map((key) => ({
    key,
    label: AGE_CATEGORY_LABEL[key],
    items: patients.filter((p) => p.ageCategory === key),
  })).filter((section) => section.items.length > 0)
}
