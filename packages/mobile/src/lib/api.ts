import Constants from 'expo-constants'
import type {
  AuthSyncResponse,
  CareCircleDetail,
  CareCircleSummary,
  ComplianceStatus,
  FamilyInvite,
  InvitePreview,
  LegalDocumentKind,
  LegalDocumentWithContent,
  OwnedPatient,
  Patient,
  ProfileShare,
} from './api.types'
import { ensureAccessToken, supabaseConfigured } from './supabase'

const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  extra?.apiUrl ??
  'http://127.0.0.1:3010'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> =
    options?.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}
  const token = await ensureAccessToken()
  if (supabaseConfigured && !token) {
    throw new Error('Sessão não disponível — faça login novamente')
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { ...headers, ...options?.headers },
      ...options,
    })
  } catch {
    throw new Error('Sem conexão com o servidor')
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const body = (await res.json().catch(() => ({}))) as { message?: string }
      throw new Error(body.message || `HTTP ${res.status}`)
    }
    throw new Error(`HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  if (!contentType.includes('application/json')) {
    throw new Error('Resposta inválida da API')
  }
  return res.json() as Promise<T>
}

export const api = {
  patients: {
    list: () => request<Patient[]>('/patients'),
    get: (id: string) => request<Patient>(`/patients/${id}`),
  },
  auth: {
    sync: () => request<AuthSyncResponse>('/auth/sync', { method: 'POST' }),
  },
  compliance: {
    status: () => request<ComplianceStatus>('/compliance/status'),
    getCurrent: (kind: LegalDocumentKind) =>
      request<LegalDocumentWithContent>(`/compliance/documents/${kind}/current`),
    accept: (body?: { kinds?: LegalDocumentKind[]; documentIds?: string[] }) =>
      request<ComplianceStatus>('/compliance/accept', {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      }),
  },
  careCircles: {
    list: () => request<CareCircleSummary[]>('/care-circles'),
    get: (id: string) => request<CareCircleDetail>(`/care-circles/${id}`),
    create: (name: string) =>
      request<{ id: string; name: string }>('/care-circles', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    update: (id: string, name: string) =>
      request<{ id: string; name: string }>(`/care-circles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      }),
    listLinkablePatients: (id: string) =>
      request<Array<{ id: string; name: string }>>(`/care-circles/${id}/linkable-patients`),
    linkPatient: (circleId: string, patientId: string) =>
      request<void>(`/care-circles/${circleId}/patients`, {
        method: 'POST',
        body: JSON.stringify({ patientId }),
      }),
    unlinkPatient: (circleId: string, patientId: string) =>
      request<void>(`/care-circles/${circleId}/patients/${patientId}`, { method: 'DELETE' }),
  },
  familyAccess: {
    listInvites: () => request<FamilyInvite[]>('/family-access/invites'),
    listOwnedPatients: (careCircleId?: string) =>
      request<OwnedPatient[]>(
        careCircleId
          ? `/family-access/owned-patients?careCircleId=${encodeURIComponent(careCircleId)}`
          : '/family-access/owned-patients',
      ),
    createInvite: (data: {
      inviteeEmail: string
      patientIds: string[]
      accessLevel?: string
      careCircleId?: string
      legitimacyAck: true
    }) =>
      request<{ acceptUrl: string; id: string }>('/family-access/invites', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    revokeInvite: (id: string) => request<void>(`/family-access/invites/${id}`, { method: 'DELETE' }),
    previewInvite: (token: string) => request<InvitePreview>(`/family-access/invites/preview/${token}`),
    acceptInvite: (token: string) =>
      request('/family-access/invites/accept', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    listProfileSharesSent: () => request<ProfileShare[]>('/family-access/profile-shares/sent'),
    listProfileSharesIncoming: () => request<ProfileShare[]>('/family-access/profile-shares/incoming'),
    createProfileShare: (data: { patientId: string; targetAccountEmail: string; legitimacyAck: true }) =>
      request('/family-access/profile-shares', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    acceptProfileShare: (data: { inviteId: string; circleId: string }) =>
      request(`/family-access/profile-shares/${data.inviteId}/accept`, {
        method: 'POST',
        body: JSON.stringify({ circleId: data.circleId }),
      }),
    declineProfileShare: (id: string) =>
      request<void>(`/family-access/profile-shares/${id}/decline`, { method: 'POST' }),
    revokeProfileShare: (id: string) =>
      request<void>(`/family-access/profile-shares/${id}`, { method: 'DELETE' }),
  },
}

export { BASE_URL }
