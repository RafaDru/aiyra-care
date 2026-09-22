import Constants from 'expo-constants'
import type {
  AuthSyncResponse,
  CompleteProfileInput,
  CreatePatientInput,
  CareCircleDetail,
  CareCircleSummary,
  ComplianceStatus,
  FamilyInvite,
  InvitePreview,
  LegalDocumentKind,
  LegalDocumentWithContent,
  Allergy,
  Authorization,
  Diagnosis,
  Exam,
  MedicalRecord,
  Medication,
  Vaccine,
  ScheduledEvent,
  IntegrationLink,
  IntegrationLinkSyncStatus,
  OwnedPatient,
  Patient,
  PlanMembershipWithPlan,
  ProfileShare,
} from './api.types'
import type { AvaActivityEvent, AvaChatResponse, AvaConversation, LlmUsageQuota } from './api.types'
import { avaChatWithActivityStream, type AvaChatRequestBody } from './ava-chat-stream'
import { getClientErrorToast } from './client-error-notify-bridge'
import { reportApiClientError, reportNetworkClientError } from './client-errors'
import { notifyServiceFailure } from './service-failure-notify'
import { ensureAccessToken, supabaseConfigured } from './supabase'

const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  extra?.apiUrl ??
  'http://127.0.0.1:3010'

async function request<T>(path: string, options?: RequestInit & { skipErrorReport?: boolean }): Promise<T> {
  const headers: Record<string, string> =
    options?.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}
  const token = await ensureAccessToken()
  if (supabaseConfigured && !token) {
    throw new Error('Sessão não disponível — faça login novamente')
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const skipReport = options?.skipErrorReport || path.startsWith('/telemetry/')
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { ...headers, ...options?.headers },
      ...options,
    })
  } catch {
    if (!skipReport) {
      reportNetworkClientError(path)
      notifyServiceFailure(getClientErrorToast(), 'api', 'NETWORK')
    }
    throw new Error('Sem conexão com o servidor')
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!res.ok) {
    if (!skipReport) {
      reportApiClientError(path, res.status)
      if (res.status >= 500 || res.status === 503) {
        notifyServiceFailure(getClientErrorToast(), 'api', `HTTP_${res.status}`)
      }
    }
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
    create: (data: CreatePatientInput) =>
      request<Patient>('/patients', { method: 'POST', body: JSON.stringify(data) }),
  },
  auth: {
    sync: () => request<AuthSyncResponse>('/auth/sync', { method: 'POST' }),
    completeProfile: (data: CompleteProfileInput) =>
      request<{ patient: Patient; needsProfile: false }>('/auth/complete-profile', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
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
  llm: {
    quota: () => request<LlmUsageQuota>('/llm/usage/quota'),
  },
  integrationLinks: {
    list: (patientId: string) =>
      request<IntegrationLink[]>(`/integration-links?patientId=${encodeURIComponent(patientId)}`),
    syncStatus: (id: string) =>
      request<IntegrationLinkSyncStatus>(`/integration-links/${encodeURIComponent(id)}/sync-status`),
  },
  planMemberships: {
    list: (patientId: string) =>
      request<PlanMembershipWithPlan[]>(`/plan-memberships?patientId=${encodeURIComponent(patientId)}`),
  },
  exams: {
    list: (patientId: string) =>
      request<Exam[]>(`/exams?patientId=${encodeURIComponent(patientId)}`),
  },
  medications: {
    list: (patientId: string) =>
      request<Medication[]>(`/medications?patientId=${encodeURIComponent(patientId)}`),
    create: (data: {
      patientId: string
      genericName: string
      brandName?: string
      dosage?: string
      frequency?: string
      route?: string
      duration?: string
      startDate?: string
      startedAt?: string
      endDate?: string
      endDateIsProjected?: boolean
      prescribingDoctor?: string
      notes?: string
      isActive?: boolean
    }) => request<Medication>('/medications', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{
      genericName: string
      brandName: string
      dosage: string
      frequency: string
      route: string
      duration: string
      startDate: string
      startedAt: string
      endDate: string
      endDateIsProjected: boolean
      prescribingDoctor: string
      notes: string
      isActive: boolean
    }>) =>
      request<Medication>(`/medications/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/medications/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  vaccines: {
    list: (patientId: string) =>
      request<Vaccine[]>(`/vaccines?patientId=${encodeURIComponent(patientId)}`),
    create: (data: {
      patientId: string
      vaccineName: string
      applicationDate: string
      doseNumber?: number
      batchNumber?: string
      nextDoseDate?: string
      appliedBy?: string
      clinic?: string
      notes?: string
      source?: string
    }) => request<Vaccine>('/vaccines', { method: 'POST', body: JSON.stringify(data) }),
    update: (
      id: string,
      data: Partial<{
        vaccineName: string
        applicationDate: string
        doseNumber: number
        batchNumber: string
        nextDoseDate: string
        appliedBy: string
        clinic: string
        notes: string
        source: string
      }>,
    ) =>
      request<Vaccine>(`/vaccines/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/vaccines/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  allergies: {
    list: (patientId: string) =>
      request<Allergy[]>(`/allergies?patientId=${encodeURIComponent(patientId)}`),
    create: (data: {
      patientId: string
      allergen: string
      reaction?: string
      severity?: string
      diagnosedDate?: string
      notes?: string
    }) => request<Allergy>('/allergies', { method: 'POST', body: JSON.stringify(data) }),
    update: (
      id: string,
      data: Partial<{
        allergen: string
        reaction: string
        severity: string
        diagnosedDate: string
        notes: string
      }>,
    ) => request<Allergy>(`/allergies/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/allergies/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  diagnoses: {
    list: (patientId: string) =>
      request<Diagnosis[]>(`/diagnoses?patientId=${encodeURIComponent(patientId)}`),
  },
  authorizations: {
    list: (patientId: string) =>
      request<Authorization[]>(`/authorizations?patientId=${encodeURIComponent(patientId)}`),
  },
  medicalRecords: {
    list: (patientId: string) =>
      request<MedicalRecord[]>(`/medical-records?patientId=${encodeURIComponent(patientId)}`),
    create: (data: {
      patientId: string
      recordDate: string
      recordType: string
      description?: string
      doctorName?: string
      doctorCrm?: string
      specialty?: string
      clinicName?: string
      notes?: string
      source?: string
    }) => request<MedicalRecord>('/medical-records', { method: 'POST', body: JSON.stringify(data) }),
    update: (
      id: string,
      data: Partial<{
        recordDate: string
        recordType: string
        description: string
        doctorName: string
        doctorCrm: string
        specialty: string
        clinicName: string
        notes: string
        source: string
      }>,
    ) =>
      request<MedicalRecord>(`/medical-records/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/medical-records/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  scheduledEvents: {
    list: (patientId: string) =>
      request<ScheduledEvent[]>(`/scheduled-events?patientId=${encodeURIComponent(patientId)}`),
  },
  ava: {
    listConversations: (patientId?: string) => {
      const qs = patientId ? `?patientId=${encodeURIComponent(patientId)}` : ''
      return request<{ items: AvaConversation[] }>(`/ava/conversations${qs}`)
    },
    chat: (
      patientId: string,
      body: AvaChatRequestBody,
    ) =>
      request<AvaChatResponse>(`/patients/${patientId}/ava/chat`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    chatWithActivity: (
      patientId: string,
      body: Omit<AvaChatRequestBody, 'streamActivity'>,
      onActivity: (event: AvaActivityEvent) => void,
      onReplyDelta?: (chunk: string) => void,
    ) => avaChatWithActivityStream(patientId, body, onActivity, onReplyDelta),
  },
}

export { BASE_URL }
