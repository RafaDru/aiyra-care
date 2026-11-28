/** Galeria visual — dev por padrão; preview/E2E com `VITE_DESIGN_ROUTES=1`. */
export function isDesignPreviewRoutesEnabled(): boolean {
  const flag = import.meta.env.VITE_DESIGN_ROUTES
  if (flag === '0' || flag === 'false') return false
  if (flag === '1' || flag === 'true') return true
  return import.meta.env.DEV
}

export const DESIGN_PATIENT_CHROME_PATH = '/design/patient-chrome'
export const DESIGN_PATIENT_CHROME_COMPARE_PATH = '/design/patient-chrome-compare'

/** Fixture estável para screenshots; não é id de banco. */
export const DESIGN_FIXTURE_PATIENT_ID = 'design-fixture-bruno-s3'