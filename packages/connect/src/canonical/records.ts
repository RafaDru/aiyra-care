import type { CanonicalRecordType } from './record-types.js'
import type { ConnectorId } from '../registry/connector.js'

/** Metadados comuns a todos os registros canônicos. */
export interface CanonicalRecordBase {
  /** Chave estável para dedup no Core (ex.: solicitation_number, exam dedup key). */
  externalKey?: string | null
  /** Payload fiel da origem para import-lineage */
  raw?: Record<string, unknown> | null
  /** Beneficiário no portal quando aplicável */
  beneficiaryKey?: string | null
  beneficiaryName?: string | null
}

export interface CanonicalAuthorization extends CanonicalRecordBase {
  type: 'authorization'
  solicitationNumber?: string | null
  status?: string | null
  classification?: string | null
  doctorName?: string | null
  requestedAt?: string | null
  validUntil?: string | null
  items?: CanonicalAuthorizationItem[]
}

export interface CanonicalAuthorizationItem extends CanonicalRecordBase {
  type: 'authorization_item'
  parentExternalKey?: string | null
  procedureCode?: string | null
  procedureName?: string | null
  quantity?: number | null
}

export interface CanonicalExam extends CanonicalRecordBase {
  type: 'exam'
  name: string
  performedAt?: string | null
  laboratory?: string | null
  resultSummary?: string | null
  fileUrls?: string[]
  modality?: string | null
}

export interface CanonicalMedicalRecord extends CanonicalRecordBase {
  type: 'medical_record'
  recordType?: string | null
  date?: string | null
  providerName?: string | null
  description?: string | null
  amount?: number | null
}

export interface CanonicalImmunization extends CanonicalRecordBase {
  type: 'immunization'
  vaccineName: string
  dose?: string | null
  administeredAt?: string | null
  lot?: string | null
}

export interface CanonicalCoverage extends CanonicalRecordBase {
  type: 'coverage'
  operatorName?: string | null
  planName?: string | null
  productCode?: string | null
  networkName?: string | null
  segmentation?: string | null
  waitingPeriods?: Record<string, unknown>[] | null
  externalPlanKey?: string | null
}

export interface CanonicalCoverageMembership extends CanonicalRecordBase {
  type: 'coverage_membership'
  memberNumber?: string | null
  role?: 'holder' | 'dependent' | string | null
  status?: string | null
  cardValidFrom?: string | null
  cardValidTo?: string | null
  cns?: string | null
}

/** Hint para matching household no Core (ex.: Amil beneficiários). */
export interface CanonicalBeneficiary extends CanonicalRecordBase {
  type: 'beneficiary'
  name: string
  marcaOtica?: string | null
  cpf?: string | null
  cns?: string | null
  birthDate?: string | null
  role?: 'holder' | 'dependent' | string | null
}

export interface CanonicalDocumentReference extends CanonicalRecordBase {
  type: 'document_reference'
  title?: string | null
  url?: string | null
  mimeType?: string | null
  capturedAt?: string | null
}

export type CanonicalRecord =
  | CanonicalAuthorization
  | CanonicalAuthorizationItem
  | CanonicalExam
  | CanonicalMedicalRecord
  | CanonicalImmunization
  | CanonicalCoverage
  | CanonicalCoverageMembership
  | CanonicalBeneficiary
  | CanonicalDocumentReference

export function canonicalRecordType(r: CanonicalRecord): CanonicalRecordType {
  return r.type
}
