import type { ConnectorId } from '../registry/connector.js'

/** Credenciais na criação — Connect cifra; Core nunca persiste plaintext após handoff. */
export interface ConnectionCredentialsInput {
  login?: string | null
  password?: string | null
  email?: string | null
}

export interface CreateConnectionInput {
  connectorId: ConnectorId
  credentials: ConnectionCredentialsInput
  /** Core: app_account.id ou tenant */
  tenantRef: string
  cardNumber?: string | null
  metadata?: Record<string, unknown>
}

export interface ConnectionSummary {
  id: string
  connectorId: ConnectorId
  tenantRef: string
  active: boolean
  lastSyncAt?: string | null
  cardNumber?: string | null
  hasSession: boolean
}
