/** Categoria de negócio do connector (não é portal_type legado). */
export type ConnectorCategory =
  | 'payer'
  | 'provider'
  | 'pharmacy'
  | 'government'
  | 'identity'

/** Como o connector autentica no provedor externo. */
export type AuthProfile =
  | 'oauth2'
  | 'session_basic'
  | 'session_token'
  | 'interactive_govbr'
  | 'api_key'

/** O que o connector pode extrair em sync. */
export type ConnectorCapability =
  | 'sync_authorizations'
  | 'sync_exams'
  | 'sync_medical_records'
  | 'sync_immunizations'
  | 'sync_coverage'
  | 'virtual_card'
  | 'import_manual'

/** ID estável do connector (ex.: unimed_bh, amil_beneficiario). */
export type ConnectorId = string

export interface ConnectorDefinition {
  id: ConnectorId
  /** Nome para UI */
  label: string
  category: ConnectorCategory
  authProfile: AuthProfile
  capabilities: ConnectorCapability[]
  /** Mapeia integration_links.portal_type legado durante migração */
  legacyPortalType?: string
  /** Etapas de sync para UI (espelho de sync-portal-profile) */
  syncStepKeys?: string[]
}
