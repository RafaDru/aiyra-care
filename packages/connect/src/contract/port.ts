import type { CanonicalSyncBatch, SyncProgressEvent } from '../canonical/batch.js'
import type { ConnectionSummary, CreateConnectionInput } from './connection.js'
import type { ConnectorDefinition } from '../registry/connector.js'

/**
 * Porta que o Aiyra Core usa para falar com o motor Connect.
 * Implementações: LocalConnectAdapter (monorepo) → RemoteConnectClient (HTTP).
 */
export interface ConnectPort {
  listConnectors(): Promise<ConnectorDefinition[]>
  createConnection(input: CreateConnectionInput): Promise<ConnectionSummary>
  getConnection(connectionId: string): Promise<ConnectionSummary | null>
  startSync(connectionId: string): Promise<{ jobId: string }>
  getSyncProgress(jobId: string): Promise<SyncProgressEvent | null>
}

/**
 * Porta inversa: Core consome lotes canônicos (import pipeline).
 */
export interface CanonicalBatchImporterPort {
  ingestBatch(batch: CanonicalSyncBatch, patientId: string): Promise<{
    imported: number
    updated: number
    skipped: number
  }>
}
