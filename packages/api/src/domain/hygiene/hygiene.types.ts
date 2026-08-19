export type HygieneEntityType = 'exam' | 'medical_record' | 'authorization' | 'vaccine'

export type HygieneCandidateStatus = 'pending' | 'same_entity' | 'distinct' | 'dismissed'

export type HygieneResolveDecision = 'same_entity' | 'distinct' | 'dismissed'

export interface HygieneCandidate {
  id: string
  accountId: string
  patientId: string
  entityType: HygieneEntityType
  entityIdA: string
  entityIdB: string
  detector: string
  score: number
  status: HygieneCandidateStatus
  evidence: Record<string, unknown>
  resolvedBy: string | null
  resolvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface HygieneCandidatePairInput {
  accountId: string
  patientId: string
  entityType: HygieneEntityType
  entityIdA: string
  entityIdB: string
  detector: string
  score: number
  evidence?: Record<string, unknown>
}

export interface HygieneCandidateView extends HygieneCandidate {
  entityA?: Record<string, unknown>
  entityB?: Record<string, unknown>
}
