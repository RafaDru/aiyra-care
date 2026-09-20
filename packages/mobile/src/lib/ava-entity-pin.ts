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
  autoSend?: boolean
}
