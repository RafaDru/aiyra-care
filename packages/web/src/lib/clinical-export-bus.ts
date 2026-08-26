export interface ClinicalExportOpenRequest {
  patientId: string
  mode?: 'summary' | 'full'
}

const EVENT = 'aiyracare:clinical-export-open'

export function requestClinicalExportOpen(request: ClinicalExportOpenRequest): void {
  window.dispatchEvent(new CustomEvent<ClinicalExportOpenRequest>(EVENT, { detail: request }))
}

export function subscribeClinicalExportOpen(
  handler: (request: ClinicalExportOpenRequest) => void,
): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<ClinicalExportOpenRequest>).detail)
  }
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
