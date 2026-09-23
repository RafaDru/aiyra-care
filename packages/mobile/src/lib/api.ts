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
  MarkerTrendGroup,
  MeasurementChartSeries,
  WhoGrowthPayload,
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
  PatientDocument,
  PatientAccessGrant,
} from './api.types'
import type {
  AvaActivityEvent,
  AvaChatResponse,
  AvaConversation,
  AvaMessage,
  AvaSessionPin,
  LlmUsageQuota,
} from './api.types'
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
    update: (
      id: string,
      data: Partial<{
        name: string
        birthDate: string
        gender: 'male' | 'female'
        bloodType: string
        weightKg: number
        heightCm: number
        cpf: string
        cns: string
      }>,
    ) =>
      request<Patient>(`/patients/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/patients/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    createClinicalExportShare: (
      id: string,
      body: { mode?: 'summary' | 'full'; ttlHours?: number } = {},
    ) =>
      request<{ token: string; expiresAt: string; shareUrl: string; referralCode: string | null }>(
        `/patients/${encodeURIComponent(id)}/clinical-export/shares`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
  },
  documents: {
    list: (patientId: string) =>
      request<PatientDocument[]>(`/documents?patientId=${encodeURIComponent(patientId)}`),
    delete: (id: string) => request<void>(`/documents/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    upload: async (
      patientId: string,
      documentType: PatientDocument['documentType'],
      file: { uri: string; name: string; mimeType?: string | null },
    ) => {
      const form = new FormData()
      form.append('patientId', patientId)
      form.append('documentType', documentType)
      form.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'application/octet-stream',
      } as unknown as Blob)
      return request<PatientDocument>('/documents/upload', { method: 'POST', body: form })
    },
  },
  patientAccess: {
    listGrants: (patientId: string) =>
      request<PatientAccessGrant[]>(`/patients/${encodeURIComponent(patientId)}/access-grants`),
    revokeGrant: (patientId: string, grantId: string) =>
      request<void>(`/patients/${encodeURIComponent(patientId)}/access-grants/${encodeURIComponent(grantId)}`, {
        method: 'DELETE',
      }),
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
    create: (data: {
      patientId: string
      examType: string
      examDate: string
      resultSummary?: string
      laboratory?: string
      notes?: string
      source?: string
    }) => request<Exam>('/exams', { method: 'POST', body: JSON.stringify(data) }),
    update: (
      id: string,
      data: Partial<{
        examType: string
        examDate: string
        resultSummary: string
        laboratory: string
        notes: string
        source: string
      }>,
    ) =>
      request<Exam>(`/exams/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/exams/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  examMarkers: {
    getTrends: (patientId: string) =>
      request<MarkerTrendGroup[]>(
        `/patients/${encodeURIComponent(patientId)}/exam-markers/trends`,
      ),
  },
  measurements: {
    chartSeries: (params: {
      patientId: string
      healthThreadId?: string
      categories?: string
      from?: string
      to?: string
    }) => {
      const qs = new URLSearchParams({ patientId: params.patientId })
      if (params.healthThreadId) qs.set('healthThreadId', params.healthThreadId)
      if (params.categories) qs.set('categories', params.categories)
      if (params.from) qs.set('from', params.from)
      if (params.to) qs.set('to', params.to)
      return request<{ series: MeasurementChartSeries[] }>(`/measurements/chart-series?${qs}`)
    },
    whoGrowth: (params: { patientId: string; typeCode: 'weight' | 'height' | 'head_circumference' }) => {
      const qs = new URLSearchParams({ patientId: params.patientId, typeCode: params.typeCode })
      return request<WhoGrowthPayload>(`/measurements/who-growth?${qs}`)
    },
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
    create: (data: {
      patientId: string
      diagnosisName: string
      diagnosisCode?: string
      description?: string
      isChronic?: boolean
      diagnosedDate?: string
      status?: string
    }) => request<Diagnosis>('/diagnoses', { method: 'POST', body: JSON.stringify(data) }),
    update: (
      id: string,
      data: Partial<{
        diagnosisName: string
        diagnosisCode: string
        description: string
        isChronic: boolean
        diagnosedDate: string
        status: string
      }>,
    ) =>
      request<Diagnosis>(`/diagnoses/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/diagnoses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
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
    create: (data: {
      patientId: string
      title: string
      scheduledAt: string
      description?: string
      endAt?: string
      kind?: ScheduledEvent['kind']
      status?: ScheduledEvent['status']
    }) => request<ScheduledEvent>('/scheduled-events', { method: 'POST', body: JSON.stringify(data) }),
    update: (
      id: string,
      data: Partial<{
        title: string
        description: string
        scheduledAt: string
        endAt: string | null
        kind: ScheduledEvent['kind']
        status: ScheduledEvent['status']
      }>,
    ) =>
      request<ScheduledEvent>(`/scheduled-events/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/scheduled-events/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  ava: {
    listConversations: (patientId?: string) => {
      const qs = patientId ? `?patientId=${encodeURIComponent(patientId)}` : ''
      return request<{ items: AvaConversation[] }>(`/ava/conversations${qs}`)
    },
    createConversation: (body: { patientId: string; healthThreadId?: string; title?: string }) =>
      request<AvaConversation>('/ava/conversations', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    getMessages: (conversationId: string) =>
      request<{ conversation: AvaConversation; messages: AvaMessage[] }>(
        `/ava/conversations/${encodeURIComponent(conversationId)}/messages`,
      ),
    getContext: (conversationId: string) =>
      request<{ conversationId: string; pins: AvaSessionPin[] }>(
        `/ava/conversations/${encodeURIComponent(conversationId)}/context`,
      ),
    archiveConversation: (conversationId: string) =>
      request<AvaConversation>(`/ava/conversations/${encodeURIComponent(conversationId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'archived' }),
      }),
    deleteConversation: (conversationId: string) =>
      request<{ deleted: boolean; conversationId: string }>(
        `/ava/conversations/${encodeURIComponent(conversationId)}`,
        { method: 'DELETE' },
      ),
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
