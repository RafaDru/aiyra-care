import type { ConnectorDefinition } from './connector.js'

/**
 * Registry estático — Fase 1. Futuro: DB ou config remota no serviço Connect.
 * Perfis de etapas detalhados permanecem em api até migração do sync UI.
 */
export const CONNECTOR_REGISTRY: Record<string, ConnectorDefinition> = {
  unimed_bh: {
    id: 'unimed_bh',
    label: 'Unimed BH',
    category: 'payer',
    authProfile: 'session_basic',
    capabilities: [
      'sync_authorizations',
      'sync_medical_records',
      'sync_exams',
      'sync_coverage',
      'virtual_card',
    ],
    legacyPortalType: 'unimed',
  },
  amil_beneficiario: {
    id: 'amil_beneficiario',
    label: 'Amil',
    category: 'payer',
    authProfile: 'session_token',
    capabilities: [
      'sync_authorizations',
      'sync_medical_records',
      'sync_exams',
      'sync_coverage',
    ],
    legacyPortalType: 'amil',
  },
  mater_dei: {
    id: 'mater_dei',
    label: 'Meu Mater Dei',
    category: 'provider',
    authProfile: 'session_basic',
    capabilities: ['sync_medical_records', 'sync_exams'],
    legacyPortalType: 'mater_dei',
  },
  bradesco_saude: {
    id: 'bradesco_saude',
    label: 'Bradesco Saúde',
    category: 'payer',
    authProfile: 'session_basic',
    capabilities: ['import_manual'],
    legacyPortalType: 'bradesco_saude',
  },
  conectesus: {
    id: 'conectesus',
    label: 'ConecteSUS',
    category: 'government',
    authProfile: 'interactive_govbr',
    capabilities: ['sync_immunizations', 'sync_exams', 'import_manual'],
    legacyPortalType: 'conectesus',
  },
  caderneta_digital: {
    id: 'caderneta_digital',
    label: 'Caderneta Digital',
    category: 'government',
    authProfile: 'interactive_govbr',
    capabilities: ['sync_immunizations', 'import_manual'],
    legacyPortalType: 'caderneta',
  },
}

export function getConnector(id: string): ConnectorDefinition | undefined {
  return CONNECTOR_REGISTRY[id]
}

export function connectorForLegacyPortal(portalType: string): ConnectorDefinition | undefined {
  return Object.values(CONNECTOR_REGISTRY).find((c) => c.legacyPortalType === portalType)
}

export function listConnectors(): ConnectorDefinition[] {
  return Object.values(CONNECTOR_REGISTRY)
}
