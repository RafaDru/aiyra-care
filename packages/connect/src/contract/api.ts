/**
 * Contrato HTTP futuro — serviço Connect deployado separado.
 * Fase 1: mesma API in-process via LocalConnectAdapter.
 */
import type { CanonicalSyncBatch, SyncProgressEvent } from '../canonical/batch.js'
import type { ConnectionSummary, CreateConnectionInput } from './connection.js'
import type { ConnectorDefinition } from '../registry/connector.js'

export const CONNECT_API_VERSION = 'v1'

export interface ConnectHttpRoutes {
  /** GET /v1/connectors */
  listConnectors: () => Promise<ConnectorDefinition[]>
  /** POST /v1/connections */
  createConnection: (body: CreateConnectionInput) => Promise<ConnectionSummary>
  /** GET /v1/connections/:id */
  getConnection: (id: string) => Promise<ConnectionSummary>
  /** POST /v1/connections/:id/sync */
  startSync: (id: string) => Promise<{ jobId: string }>
  /** GET /v1/sync-jobs/:jobId */
  getSyncProgress: (jobId: string) => Promise<SyncProgressEvent>
  /**
   * POST /v1/internal/batches (Core ← Connect)
   * Autenticação mTLS ou service token; não exposta ao browser.
   */
  deliverBatch?: (batch: CanonicalSyncBatch) => Promise<{ accepted: boolean }>
}

/** Webhook opcional: Connect notifica Core quando batch está pronto. */
export interface ConnectWebhookPayload {
  event: 'sync.progress' | 'sync.completed' | 'sync.failed'
  jobId: string
  connectionId: string
  progress?: SyncProgressEvent
  batch?: CanonicalSyncBatch
}
