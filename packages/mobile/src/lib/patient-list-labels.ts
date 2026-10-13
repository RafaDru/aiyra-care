import type { Patient } from './api.types'

export const AGE_CATEGORY_I18N: Record<Patient['ageCategory'], string> = {
  children: 'dashboard.ageBand.children',
  adolescents: 'dashboard.ageBand.adolescents',
  adults: 'dashboard.ageBand.adults',
}

export const AGE_CATEGORY_ORDER: Patient['ageCategory'][] = ['adults', 'adolescents', 'children']

export function groupPatientsByAgeCategory(
  patients: Patient[],
): Array<{ key: Patient['ageCategory']; labelKey: string; items: Patient[] }> {
  return AGE_CATEGORY_ORDER.map((key) => ({
    key,
    labelKey: AGE_CATEGORY_I18N[key],
    items: patients.filter((p) => p.ageCategory === key),
  })).filter((section) => section.items.length > 0)
}
