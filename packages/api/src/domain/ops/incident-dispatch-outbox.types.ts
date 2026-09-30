export type IncidentDispatchOutboxStatus = 'pending' | 'forwarded' | 'claimed' | 'failed' | 'dead'

export interface IncidentDispatchOutboxRecord {
  id: string
  incidentId: string
  idempotencyKey: string
  payload: Record<string, unknown>
  status: IncidentDispatchOutboxStatus
  attemptCount: number
  lastError: string | null
  forwardedAt: string | null
  claimedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface InsertIncidentDispatchOutboxInput {
  incidentId: string
  idempotencyKey: string
  payload: Record<string, unknown>
}
