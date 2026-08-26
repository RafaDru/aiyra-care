/** Pin de entidade para aceleradores Ava (G1) — espelha body da API. */
export type AvaEntityPin =
  | { entityType: 'exam'; entityId: string }
  | { entityType: 'exam_order'; entityId: string }
  | { entityType: 'exam_result_item'; entityId: string }
  | { entityType: 'exam_marker'; markerName: string }

export interface AvaOpenRequest {
  patientId: string
  initialMessage?: string
  entityPin?: AvaEntityPin
  /** Envia a pergunta automaticamente ao abrir o drawer. */
  autoSend?: boolean
}

const EVENT = 'aiyracare:ava-open'

export function requestAvaOpen(request: AvaOpenRequest): void {
  window.dispatchEvent(new CustomEvent<AvaOpenRequest>(EVENT, { detail: request }))
}

export function subscribeAvaOpen(handler: (request: AvaOpenRequest) => void): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<AvaOpenRequest>).detail)
  }
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
