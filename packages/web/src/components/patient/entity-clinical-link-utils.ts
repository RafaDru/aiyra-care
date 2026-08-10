import type { ClinicalEntityType, RelationType } from '../../lib/api.types.js'
import type { ClinicalFlowNode } from '../../lib/api.types.js'

const RELATION_META: Record<
  string,
  Pick<RelationType, 'label' | 'fromEntityType' | 'toEntityType' | 'neo4jRelType' | 'description'>
> = {
  ORDERED_EXAM: {
    label: 'Solicitou exame',
    fromEntityType: 'medical_record',
    toEntityType: 'exam',
    neo4jRelType: 'ORDERED',
    description: 'Consulta solicitou exame',
  },
  ORDERED_AUTH: {
    label: 'Solicitou procedimento',
    fromEntityType: 'medical_record',
    toEntityType: 'authorization',
    neo4jRelType: 'ORDERED',
    description: 'Consulta gerou pedido/autorização',
  },
  AUTHORIZED_FOR: {
    label: 'Autorizou exame',
    fromEntityType: 'authorization',
    toEntityType: 'exam',
    neo4jRelType: 'AUTHORIZED_FOR',
    description: 'Guia/autorização cobre o exame',
  },
  RESULT_OF: {
    label: 'Resultado de',
    fromEntityType: 'exam',
    toEntityType: 'authorization',
    neo4jRelType: 'RESULT_OF',
    description: 'Laudo vinculado à guia',
  },
  RELATED: {
    label: 'Relacionado',
    fromEntityType: 'clinical_entity',
    toEntityType: 'clinical_entity',
    neo4jRelType: 'RELATED',
    description: 'Associação clínica genérica',
  },
}

export const CLINICAL_FLOW_NODE_ORDER: Record<string, number> = {
  medical_record: 0,
  authorization: 1,
  exam: 2,
  medication: 3,
  diagnosis: 4,
  vaccine: 5,
  health_thread: 6,
}

export function sortClinicalFlowNodes(nodes: ClinicalFlowNode[]): ClinicalFlowNode[] {
  return [...nodes].sort((a, b) => {
    const oa = CLINICAL_FLOW_NODE_ORDER[a.entityType] ?? 9
    const ob = CLINICAL_FLOW_NODE_ORDER[b.entityType] ?? 9
    if (oa !== ob) return oa - ob
    return (a.date ?? '').localeCompare(b.date ?? '')
  })
}

export function defaultClinicalRelationCode(
  fromType: ClinicalEntityType,
  toType: ClinicalEntityType,
): string | undefined {
  if (fromType === 'medical_record' && toType === 'exam') return 'ORDERED_EXAM'
  if (fromType === 'medical_record' && toType === 'authorization') return 'ORDERED_AUTH'
  if (fromType === 'authorization' && toType === 'exam') return 'AUTHORIZED_FOR'
  if (fromType === 'exam' && toType === 'authorization') return 'RESULT_OF'
  if (fromType === 'exam' && toType === 'health_thread') return 'SUPPORTS_HYPOTHESIS'
  return 'RELATED'
}

function relationTypeFromCode(code: string): RelationType {
  const meta = RELATION_META[code]
  return {
    code,
    label: meta?.label ?? code,
    fromEntityType: meta?.fromEntityType ?? 'clinical_entity',
    toEntityType: meta?.toEntityType ?? 'clinical_entity',
    neo4jRelType: meta?.neo4jRelType ?? 'RELATED',
    description: meta?.description ?? null,
    inverseLabel: null,
  }
}

/** Opções locais quando a API ainda não respondeu ou não tem seeds no banco. */
export function fallbackRelationTypes(
  fromType: ClinicalEntityType,
  toType: ClinicalEntityType,
): RelationType[] {
  const codes = new Set<string>()
  const specific = defaultClinicalRelationCode(fromType, toType)
  if (specific) codes.add(specific)
  codes.add('RELATED')
  return [...codes].map(relationTypeFromCode)
}

export function pickClinicalRelationCode(
  types: RelationType[],
  fromType: ClinicalEntityType,
  toType: ClinicalEntityType,
): string | undefined {
  const defaultCode = defaultClinicalRelationCode(fromType, toType)
  if (defaultCode && types.some((t) => t.code === defaultCode)) return defaultCode
  return types[0]?.code
}

export function entityKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`
}
