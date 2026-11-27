/** Dev-only galeria visual — paridade Canvas vs componentes reais (sem API). */
export function isDesignPreviewRoutesEnabled(): boolean {
  if (!import.meta.env.DEV) return false
  const flag = import.meta.env.VITE_DESIGN_ROUTES
  if (flag === '0' || flag === 'false') return false
  return true
}

export const DESIGN_PATIENT_CHROME_PATH = '/design/patient-chrome'
export const DESIGN_PATIENT_CHROME_COMPARE_PATH = '/design/patient-chrome-compare'

/** Fixture estável para screenshots; não é id de banco. */
export const DESIGN_FIXTURE_PATIENT_ID = 'design-fixture-bruno-s3'