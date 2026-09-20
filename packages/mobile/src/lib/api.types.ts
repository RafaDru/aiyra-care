export interface Patient {
  id: string
  name: string
  birthDate: string
  gender: 'male' | 'female' | null
  bloodType: string | null
  ageCategory: 'children' | 'adolescents' | 'adults'
  createdAt: string
  updatedAt: string
}

export interface AppAccount {
  authProvider: string
  authSubject: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthSyncResponse {
  account: AppAccount
  isNew: boolean
  needsProfile: boolean
}

export type LegalDocumentKind = 'terms_of_use' | 'privacy_policy' | 'cookie_policy' | 'minor_guardian_consent'

export interface ComplianceStatus {
  compliant: boolean
  requiredKinds: LegalDocumentKind[]
  pendingKinds: LegalDocumentKind[]
  acceptances: Array<{
    kind: LegalDocumentKind
    version: string
    acceptedAt: string
    documentId: string
  }>
}

export interface LegalDocumentWithContent {
  id: string
  kind: LegalDocumentKind
  version: string
  title: string
  summary: string | null
  content: string
  effectiveAt: string
  publishedAt: string
  requiresAcceptance: boolean
}

export interface FamilyInvite {
  id: string
  inviteeEmail: string
  patientIds: string[]
  careCircleId?: string | null
  accessLevel: string
  status: string
  expiresAt: string
}

export interface InvitePreview {
  inviteeEmail: string
  patientNames: string[]
  inviterDisplayName: string | null
  circleName?: string | null
  accessLevel: string
  status: string
  expiresAt: string
}

export interface ProfileShare {
  id: string
  patientId: string
  patientName: string
  ownerDisplayName?: string | null
  targetAccountEmail: string
  targetCircleId?: string | null
  targetCircleName?: string | null
  status: string
  expiresAt: string
}

export interface CareCircleSummary {
  id: string
  name: string
  memberRole?: string
}

export interface CareCircleDetail extends CareCircleSummary {
  memberRole: string
  members: Array<{
    id: string
    accountId: string
    role: string
    email?: string | null
    displayName?: string | null
  }>
  patients: Array<{ patientId: string; patientName: string; linkKind?: string }>
}

export interface OwnedPatient {
  id: string
  name: string
}
