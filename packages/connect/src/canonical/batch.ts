import type { ConnectorId } from '../registry/connector.js'
import type { CanonicalRecord } from './records.js'

export type SyncJobStatus = 'pending' | 'running' | 'success' | 'failed'

/** Progresso reportado pelo Connect (UI polling). */
export interface SyncProgressEvent {
  jobId: string
  connectionId: string
  connectorId: ConnectorId
  step: string
  message: string
  status: SyncJobStatus
  portalType?: string | null
  stepDetails?: Record<string, { status: SyncJobStatus; message: string }>
  warnings?: string[]
}

/** Lote entregue ao Core após extract+normalize no Connect. */
export interface CanonicalSyncBatch {
  batchId: string
  connectionId: string
  connectorId: ConnectorId
  jobId: string
  /** Referência opaque — Core resolve connectionId → patientId(s) */
  tenantRef?: string | null
  startedAt: string
  finishedAt?: string | null
  status: 'completed' | 'failed' | 'partial'
  records: CanonicalRecord[]
  stats: Record<string, number>
  warnings?: string[]
  novelty?: Record<string, unknown> | null
}

export interface ImportBatchResult {
  batchId: string
  imported: number
  updated: number
  skipped: number
  errors?: string[]
}
