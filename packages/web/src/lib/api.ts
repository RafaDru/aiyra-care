/** Em dev o Vite faz proxy à API (porta 3010). Não usar localhost:3000 — conflita com outros apps. */
const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:3010')

export function documentDownloadUrl(documentId: string): string {
  return `${BASE_URL}/documents/${documentId}/download`
}

export function examResultFileUrl(examId: string): string {
  return `${BASE_URL}/exams/${examId}/result-file`
}

/** Download autenticado (Bearer) — links diretos `<a href>` não enviam o token Supabase. */
export async function fetchAuthenticatedBlob(path: string): Promise<Blob> {
  const headers: Record<string, string> = {}
  const { ensureAccessToken, supabaseConfigured } = await import('./supabase.js')
  const token = await ensureAccessToken()
  if (supabaseConfigured && !token) {
    throw new Error('Sessão não disponível — faça login novamente')
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${path}`, { headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message || `HTTP ${res.status}`)
  }
  return res.blob()
}

export async function openAuthenticatedDownload(path: string): Promise<void> {
  const blob = await fetchAuthenticatedBlob(path)
  const blobUrl = URL.createObjectURL(blob)
  window.open(blobUrl, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData
  const headers: Record<string, string> = options?.body && !isFormData ? { 'Content-Type': 'application/json' } : {}
  const { ensureAccessToken, supabaseConfigured } = await import('./supabase.js')
  const token = await ensureAccessToken()
  if (supabaseConfigured && !token) {
    throw new Error('Sessão não disponível — aguarde ou faça login novamente')
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { ...headers, ...options?.headers },
    ...options,
  })
  const contentType = res.headers.get('content-type') ?? ''
  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const body = await res.json().catch(() => ({})) as { message?: string; code?: string; error?: unknown }
      const zodMsg = body.error && typeof body.error === 'object' && 'fieldErrors' in (body.error as object)
        ? JSON.stringify(body.error)
        : undefined
      throw new Error(body.message || zodMsg || `HTTP ${res.status}`)
    }
    const text = await res.text().catch(() => '')
    if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
      throw new Error('API indisponível ou rota não encontrada — recarregue a página ou reinicie os serviços')
    }
    throw new Error(text.slice(0, 120) || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '')
    if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
      throw new Error('Resposta inválida da API (HTML) — verifique se a API está rodando em :3010')
    }
    throw new Error('Resposta inválida da API')
  }
  return res.json()
}

import { avaChatWithActivityStream, type AvaChatRequestBody } from './ava-chat-stream.js'

export const api = {
  patients: {
    list: () => request<import('./api.types.js').Patient[]>('/patients'),
    get: (id: string) => request<import('./api.types.js').Patient>(`/patients/${id}`),
    context: (id: string, timelineMonths?: number) =>
      request<import('./api.types.js').PatientContext>(
        `/patients/${id}/context${timelineMonths ? `?timelineMonths=${timelineMonths}` : ''}`,
      ),
    clinicalExport: (id: string, mode: 'summary' | 'full' = 'summary') =>
      request<import('./api.types.js').PatientClinicalExport>(
        `/patients/${id}/clinical-export?mode=${mode}`,
      ),
    createClinicalExportShare: (
      id: string,
      body: { mode?: 'summary' | 'full'; ttlHours?: number },
    ) =>
      request<{ token: string; expiresAt: string; shareUrl: string }>(
        `/patients/${id}/clinical-export/shares`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    timeline: (id: string, params?: import('./api.types.js').PatientTimelineQuery) => {
      const qs = new URLSearchParams()
      if (params?.timelineMonths) qs.set('timelineMonths', String(params.timelineMonths))
      if (params?.kinds?.length) qs.set('kinds', params.kinds.join(','))
      if (params?.sources?.length) qs.set('sources', params.sources.join(','))
      if (params?.from) qs.set('from', params.from)
      if (params?.to) qs.set('to', params.to)
      if (params?.limit) qs.set('limit', String(params.limit))
      if (params?.offset) qs.set('offset', String(params.offset))
      const query = qs.toString()
      return request<import('./api.types.js').PatientTimeline>(
        `/patients/${id}/timeline${query ? `?${query}` : ''}`,
      )
    },
    timelineGraph: (id: string, limit = 200) =>
      request<import('./api.types.js').PatientTimeline>(
        `/patients/${id}/timeline/graph?limit=${limit}`,
      ),
    graphClinicalFlow: (id: string) =>
      request<import('./api.types.js').ClinicalFlow>(`/patients/${id}/graph/clinical-flow`),
    graphClinicalPaths: (id: string) =>
      request<import('./api.types.js').ClinicalFlow>(`/patients/${id}/graph/clinical-paths`),
    create: (data: object) => request<import('./api.types.js').Patient>('/patients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) => request<import('./api.types.js').Patient>(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/patients/${id}`, { method: 'DELETE' }),
    importCaderneta: (patientId: string, data: object) =>
      request<import('./api.types.js').CadernetaImportResult>(`/patients/${patientId}/import-caderneta`, { method: 'POST', body: JSON.stringify(data) }),
    cadernetaFamilyPlan: (patientId: string, data: object) =>
      request<import('./api.types.js').CadernetaFamilyImportPlan>(`/patients/${patientId}/caderneta-family-plan`, { method: 'POST', body: JSON.stringify(data) }),
    importCadernetaFamily: (patientId: string, data: object) =>
      request<import('./api.types.js').CadernetaFamilyImportResult>(`/patients/${patientId}/import-caderneta-family`, { method: 'POST', body: JSON.stringify(data) }),
    vaccineSchedule: (patientId: string) =>
      request<import('./api.types.js').VaccineScheduleItem[]>(`/patients/${patientId}/vaccine-schedule`),
    developmentMilestones: (patientId: string) =>
      request<import('./api.types.js').DevelopmentMilestone[]>(`/patients/${patientId}/development-milestones`),
  },
  growthRecords: {
    list: (patientId?: string) => request<import('./api.types.js').GrowthRecord[]>(`/growth-records${patientId ? `?patientId=${patientId}` : ''}`),
    create: (data: object) => request<import('./api.types.js').GrowthRecord>('/growth-records', { method: 'POST', body: JSON.stringify(data) }),
  },
  measurements: {
    listTypes: () => request<import('./api.types.js').MeasurementType[]>('/measurement-types'),
    list: (params: { patientId: string; healthThreadId?: string; typeCodes?: string; categories?: string }) => {
      const qs = new URLSearchParams({ patientId: params.patientId })
      if (params.healthThreadId) qs.set('healthThreadId', params.healthThreadId)
      if (params.typeCodes) qs.set('typeCodes', params.typeCodes)
      if (params.categories) qs.set('categories', params.categories)
      return request<import('./api.types.js').MeasurementObservation[]>(`/measurements?${qs}`)
    },
    create: (data: object) =>
      request<import('./api.types.js').MeasurementObservation>('/measurements', { method: 'POST', body: JSON.stringify(data) }),
    createBatch: (data: object) =>
      request<import('./api.types.js').MeasurementObservation[]>('/measurements/batch', { method: 'POST', body: JSON.stringify(data) }),
    chartSeries: (params: { patientId: string; healthThreadId?: string; categories?: string; from?: string; to?: string }) => {
      const qs = new URLSearchParams({ patientId: params.patientId })
      if (params.healthThreadId) qs.set('healthThreadId', params.healthThreadId)
      if (params.categories) qs.set('categories', params.categories)
      if (params.from) qs.set('from', params.from)
      if (params.to) qs.set('to', params.to)
      return request<{ series: import('./api.types.js').MeasurementChartSeriesPayload[] }>(`/measurements/chart-series?${qs}`)
    },
    timeline: (params: { patientId: string; healthThreadId?: string; from?: string; to?: string }) => {
      const qs = new URLSearchParams({ patientId: params.patientId })
      if (params.healthThreadId) qs.set('healthThreadId', params.healthThreadId)
      if (params.from) qs.set('from', params.from)
      if (params.to) qs.set('to', params.to)
      return request<import('./api.types.js').MonitoringTimelineRow[]>(`/measurements/timeline?${qs}`)
    },
    whoGrowth: (params: { patientId: string; typeCode: 'weight' | 'height' | 'head_circumference' }) => {
      const qs = new URLSearchParams({ patientId: params.patientId, typeCode: params.typeCode })
      return request<import('./api.types.js').WhoGrowthPayload>(`/measurements/who-growth?${qs}`)
    },
    importGlucose: (patientId: string) =>
      request<import('./api.types.js').GlucoseImportResult>('/measurements/import-glucose', {
        method: 'POST',
        body: JSON.stringify({ patientId }),
      }),
  },
  medicationAdministrations: {
    create: (data: object) =>
      request<import('./api.types.js').MedicationAdministrationRow>('/medication-administrations', { method: 'POST', body: JSON.stringify(data) }),
    list: (params: { patientId: string; healthThreadId?: string }) => {
      const qs = new URLSearchParams({ patientId: params.patientId })
      if (params.healthThreadId) qs.set('healthThreadId', params.healthThreadId)
      return request<import('./api.types.js').MedicationAdministrationRow[]>(`/medication-administrations?${qs}`)
    },
  },
  careReminders: {
    list: (params: { patientId: string; healthThreadId?: string }) => {
      const qs = new URLSearchParams({ patientId: params.patientId, activeOnly: 'true' })
      if (params.healthThreadId) qs.set('healthThreadId', params.healthThreadId)
      return request<import('./api.types.js').CareReminderRow[]>(`/care-reminders?${qs}`)
    },
    pending: (patientId: string) =>
      request<import('./api.types.js').CareReminderRow[]>(`/care-reminders/pending?patientId=${patientId}`),
    create: (data: object) =>
      request<import('./api.types.js').CareReminderRow>('/care-reminders', { method: 'POST', body: JSON.stringify(data) }),
    createIllnessPack: (data: object) =>
      request<import('./api.types.js').CareReminderRow[]>('/care-reminders/illness-pack', { method: 'POST', body: JSON.stringify(data) }),
    complete: (id: string) =>
      request<import('./api.types.js').CareReminderRow>(`/care-reminders/${id}/complete`, { method: 'POST', body: '{}' }),
    snooze: (id: string, minutes = 30) =>
      request<import('./api.types.js').CareReminderRow>(`/care-reminders/${id}/snooze`, { method: 'POST', body: JSON.stringify({ minutes }) }),
    deactivate: (id: string) =>
      request<import('./api.types.js').CareReminderRow>(`/care-reminders/${id}/deactivate`, { method: 'POST', body: '{}' }),
  },
  monitoringExport: (params: { patientId: string; healthThreadId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams({ patientId: params.patientId })
    if (params.healthThreadId) qs.set('healthThreadId', params.healthThreadId)
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    return request<import('./api.types.js').MonitoringExportReport>(`/monitoring-export?${qs}`)
  },
  familySupport: {
    insights: (
      patientId: string,
      params?: { medicationName?: string; healthThreadId?: string },
    ) => {
      const qs = new URLSearchParams()
      if (params?.medicationName) qs.set('medicationName', params.medicationName)
      if (params?.healthThreadId) qs.set('healthThreadId', params.healthThreadId)
      const query = qs.toString()
      return request<import('./api.types.js').FamilySupportBundle>(
        `/patients/${patientId}/family-support/insights${query ? `?${query}` : ''}`,
      )
    },
  },
  ava: {
    listConversations: (patientId?: string) => {
      const qs = patientId ? `?patientId=${encodeURIComponent(patientId)}` : ''
      return request<{ items: import('./api.types.js').AvaConversation[] }>(`/ava/conversations${qs}`)
    },
    createConversation: (body: { patientId: string; healthThreadId?: string; title?: string }) =>
      request<import('./api.types.js').AvaConversation>('/ava/conversations', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    getConversation: (conversationId: string) =>
      request<import('./api.types.js').AvaConversation>(`/ava/conversations/${conversationId}`),
    getMessages: (conversationId: string) =>
      request<{
        conversation: import('./api.types.js').AvaConversation
        messages: import('./api.types.js').AvaMessage[]
      }>(`/ava/conversations/${conversationId}/messages`),
    chat: (patientId: string, body: {
      message: string
      healthThreadId?: string
      history?: Array<{ role: 'user' | 'assistant'; content: string }>
      allowLlmDataSharing?: boolean
      entityPin?: import('./ava-dock-bus.js').AvaEntityPin
      streamActivity?: boolean
      conversationId?: string
      attachmentDocumentId?: string
    }) =>
      request<import('./api.types.js').AvaChatResponse>(`/patients/${patientId}/ava/chat`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    chatWithActivity: (
      patientId: string,
      body: Omit<AvaChatRequestBody, 'streamActivity'>,
      onActivity: (event: import('./api.types.js').AvaActivityEvent) => void,
    ) => avaChatWithActivityStream(patientId, body, onActivity),
  },
  llm: {
    quota: () => request<import('./api.types.js').LlmUsageQuota>('/llm/usage/quota'),
  },
  emergency: {
    directory: (params?: { category?: string; stateCode?: string }) => {
      const qs = new URLSearchParams()
      if (params?.category) qs.set('category', params.category)
      if (params?.stateCode) qs.set('stateCode', params.stateCode)
      const query = qs.toString()
      return request<import('./api.types.js').EmergencyDirectoryEntry[]>(
        `/emergency/directory${query ? `?${query}` : ''}`,
      )
    },
    contacts: (patientId: string) =>
      request<import('./api.types.js').PatientEmergencyContact[]>(
        `/emergency/contacts?patientId=${patientId}`,
      ),
    createContact: (data: object) =>
      request<import('./api.types.js').PatientEmergencyContact>('/emergency/contacts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateContact: (id: string, data: object) =>
      request<import('./api.types.js').PatientEmergencyContact>(`/emergency/contacts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteContact: (id: string) =>
      request<void>(`/emergency/contacts/${id}`, { method: 'DELETE' }),
  },
  scheduledEvents: {
    list: (patientId?: string, params?: { status?: string; healthThreadId?: string }) => {
      const qs = new URLSearchParams()
      if (patientId) qs.set('patientId', patientId)
      if (params?.status) qs.set('status', params.status)
      if (params?.healthThreadId) qs.set('healthThreadId', params.healthThreadId)
      const query = qs.toString()
      return request<import('./api.types.js').ScheduledEvent[]>(`/scheduled-events${query ? `?${query}` : ''}`)
    },
    create: (data: object) =>
      request<import('./api.types.js').ScheduledEvent>('/scheduled-events', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) =>
      request<import('./api.types.js').ScheduledEvent>(`/scheduled-events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/scheduled-events/${id}`, { method: 'DELETE' }),
    importIcs: (body: { patientId: string; ics: string; sourceLabel?: string }) =>
      request<import('./api.types.js').IcsImportResult>('/scheduled-events/import/ics', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    exportIcsUrl: (patientId: string) =>
      `${import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:3010')}/scheduled-events/export/ics?patientId=${patientId}`,
  },
  calendar: {
    googleStatus: (patientId: string) =>
      request<import('./api.types.js').GoogleCalendarStatus>(
        `/calendar/google/status?patientId=${encodeURIComponent(patientId)}`,
      ),
    googleOAuthStart: (patientId: string, returnTo?: string) => {
      const qs = new URLSearchParams({ patientId })
      if (returnTo) qs.set('returnTo', returnTo)
      return request<{ url: string }>(`/calendar/google/oauth/start?${qs.toString()}`)
    },
    googleSync: (patientId: string) =>
      request<import('./api.types.js').GoogleCalendarSyncResult>('/calendar/google/sync', {
        method: 'POST',
        body: JSON.stringify({ patientId }),
      }),
    googleDisconnect: (patientId: string) =>
      request<{ ok: boolean }>('/calendar/google/disconnect', {
        method: 'POST',
        body: JSON.stringify({ patientId }),
      }),
    microsoftStatus: (patientId: string) =>
      request<import('./api.types.js').GoogleCalendarStatus>(
        `/calendar/microsoft/status?patientId=${encodeURIComponent(patientId)}`,
      ),
    microsoftOAuthStart: (patientId: string, returnTo?: string) => {
      const qs = new URLSearchParams({ patientId })
      if (returnTo) qs.set('returnTo', returnTo)
      return request<{ url: string }>(`/calendar/microsoft/oauth/start?${qs.toString()}`)
    },
    microsoftSync: (patientId: string) =>
      request<import('./api.types.js').GoogleCalendarSyncResult>('/calendar/microsoft/sync', {
        method: 'POST',
        body: JSON.stringify({ patientId }),
      }),
    microsoftDisconnect: (patientId: string) =>
      request<{ ok: boolean }>('/calendar/microsoft/disconnect', {
        method: 'POST',
        body: JSON.stringify({ patientId }),
      }),
  },
  billing: {
    offers: () => request<import('./api.types.js').BillingOffers>('/billing/offers'),
    me: () => request<import('./api.types.js').BillingMe>('/billing/me'),
    checkout: (packageId: 'pack_10' | 'pack_30') =>
      request<{ sessionId: string; url: string | null }>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ packageId }),
      }),
    checkoutSubscription: () =>
      request<{ sessionId: string; url: string | null }>('/billing/checkout-subscription', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    customerPortal: () =>
      request<{ url: string }>('/billing/customer-portal', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    downloadContabilizeiExport: async (month?: string) => {
      const { ensureAccessToken } = await import('./supabase.js')
      const token = await ensureAccessToken()
      const q = month ? `?month=${encodeURIComponent(month)}` : ''
      const res = await fetch(`${BASE_URL}/billing/export/contabilizei${q}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? `billing-export-${month ?? 'current'}.csv`
      return { blob, filename }
    },
  },
  vaccines: {
    list: (patientId?: string) => request<import('./api.types.js').Vaccine[]>(`/vaccines${patientId ? `?patientId=${patientId}` : ''}`),
    create: (data: object) => request<import('./api.types.js').Vaccine>('/vaccines', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) => request<import('./api.types.js').Vaccine>(`/vaccines/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  carePlaces: {
    search: (q = '', limit = 20) =>
      request<import('./api.types.js').CarePlace[]>(
        `/care-places?q=${encodeURIComponent(q)}&limit=${limit}`,
      ),
  },
  medications: {
    list: (patientId?: string) => request<import('./api.types.js').Medication[]>(`/medications${patientId ? `?patientId=${patientId}` : ''}`),
    create: (data: object) => request<import('./api.types.js').Medication>('/medications', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) => request<import('./api.types.js').Medication>(`/medications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  allergies: {
    list: (patientId?: string) => request<import('./api.types.js').Allergy[]>(`/allergies${patientId ? `?patientId=${patientId}` : ''}`),
    create: (data: object) => request<import('./api.types.js').Allergy>('/allergies', { method: 'POST', body: JSON.stringify(data) }),
  },
  exams: {
    list: (patientId?: string) => request<import('./api.types.js').Exam[]>(`/exams${patientId ? `?patientId=${patientId}` : ''}`),
    create: (data: object) => request<import('./api.types.js').Exam>('/exams', { method: 'POST', body: JSON.stringify(data) }),
  },
  examMarkers: {
    listByPatient: (patientId: string, markerName?: string) =>
      request<import('./api.types.js').ExamMarker[]>(
        `/exam-markers?patientId=${patientId}${markerName ? `&markerName=${encodeURIComponent(markerName)}` : ''}`
      ),
    listByExam: (examId: string) =>
      request<import('./api.types.js').ExamMarker[]>(`/exams/${examId}/markers`),
    getTrends: (patientId: string) =>
      request<import('./api.types.js').MarkerTrendGroup[]>(`/patients/${patientId}/exam-markers/trends`),
    createBatch: (items: object[]) =>
      request<import('./api.types.js').ExamMarker[]>('/exam-markers/batch', {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
  },
  examOrders: {
    list: (patientId?: string) =>
      request<import('./api.types.js').ExamOrder[]>(`/exam-orders${patientId ? `?patientId=${patientId}` : ''}`),
  },
  documents: {
    list: (patientId?: string) => request<import('./api.types.js').Document_[]>(`/documents${patientId ? `?patientId=${patientId}` : ''}`),
    create: (data: object) => request<import('./api.types.js').Document_>('/documents', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) => request<import('./api.types.js').Document_>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/documents/${id}`, { method: 'DELETE' }),
    ocrStats: () => request<import('./api.types.js').OcrStats>('/documents/ocr-stats'),
    upload: (patientId: string, documentType: string, file: File) => {
      const form = new FormData()
      form.append('patientId', patientId)
      form.append('documentType', documentType)
      form.append('file', file, file.name)
      return request<import('./api.types.js').Document_>('/documents/upload', { method: 'POST', body: form })
    },
    applyIdentity: (id: string, data: object) =>
      request<{
        patient: import('./api.types.js').Patient
        suggestedPatient: import('./api.types.js').SuggestedPatientFields
        applied: { cpf: boolean; name: boolean; birthDate: boolean }
      }>(`/documents/${id}/apply-identity`, { method: 'POST', body: JSON.stringify(data) }),
    interpretHandwriting: (id: string) => request<{
      interpretation: import('./api.types.js').PrescriptionInterpretation
      quota: import('./api.types.js').HandwritingQuota
      creditSource: 'monthly_free' | 'package'
      tier: 'free' | 'premium'
    }>(`/documents/${id}/interpret-handwriting`, { method: 'POST' }),
    interpretVaccineCard: (id: string) => request<{
      interpretation: import('./api.types.js').VaccineCardInterpretation
      quota: import('./api.types.js').HandwritingQuota
      creditSource: 'monthly_free' | 'package'
      tier: 'free' | 'premium'
    }>(`/documents/${id}/interpret-vaccine-card`, { method: 'POST' }),
    getInterpretation: (id: string) => request<{
      documentId: string
      documentType: string
      interpretation: import('./api.types.js').PrescriptionInterpretation | import('./api.types.js').VaccineCardInterpretation | null
      interpretedAt: string | null
      interpretationProvider: string | null
    }>(`/documents/${id}/interpretation`),
  },
  handwritingCredits: {
    quota: () => request<import('./api.types.js').HandwritingQuota & { paidOcrAllowed: boolean }>('/handwriting-credits/quota'),
  },
  medicalRecords: {
    list: (patientId?: string) => request<import('./api.types.js').MedicalRecord[]>(`/medical-records${patientId ? `?patientId=${patientId}` : ''}`),
    create: (data: object) => request<import('./api.types.js').MedicalRecord>('/medical-records', { method: 'POST', body: JSON.stringify(data) }),
  },
  diagnoses: {
    list: (patientId?: string) => request<import('./api.types.js').Diagnosis[]>(`/diagnoses${patientId ? `?patientId=${patientId}` : ''}`),
    create: (data: object) => request<import('./api.types.js').Diagnosis>('/diagnoses', { method: 'POST', body: JSON.stringify(data) }),
  },
  authorizations: {
    list: (patientId?: string) => request<import('./api.types.js').Authorization[]>(`/authorizations${patientId ? `?patientId=${patientId}` : ''}`),
    create: (data: object) => request<import('./api.types.js').Authorization>('/authorizations', { method: 'POST', body: JSON.stringify(data) }),
  },
  sessions: {
    list: () => request<import('./api.types.js').Session[]>('/sessions'),
  },
  roadmap: {
    get: () => request<import('./roadmap.types.js').RoadmapData>('/roadmap'),
  },
  integrationLinks: {
    list: (patientId: string) => request<import('./api.types.js').IntegrationLink[]>(`/integration-links?patientId=${patientId}`),
    create: (data: object) => request<import('./api.types.js').IntegrationLink>('/integration-links', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) => request<import('./api.types.js').IntegrationLink>(`/integration-links/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/integration-links/${id}`, { method: 'DELETE' }),
    sync: (id: string, opts?: { silent?: boolean; force?: boolean }) => {
      const params = new URLSearchParams()
      if (opts?.silent) params.set('silent', '1')
      if (opts?.force) params.set('force', '1')
      const q = params.toString()
      return request<{ jobId: string | null; silent?: boolean; skipped?: boolean; reason?: string }>(
        `/integration-links/${id}/sync${q ? `?${q}` : ''}`,
        { method: 'POST' },
      )
    },
    virtualCard: (id: string) => request<import('./api.types.js').UnimedVirtualCard>(`/integration-links/${id}/virtual-card`, { method: 'POST' }),
    syncStatus: (id: string) => request<import('./api.types.js').IntegrationLinkSyncStatus>(`/integration-links/${id}/sync-status`),
    syncProgress: (jobId: string) => request<{
      step: string
      message: string
      status: string
      portalType?: 'unimed' | 'amil' | 'mater_dei' | 'hermes_pardini'
      stepDetails?: Record<string, { status: 'running' | 'success' | 'failed'; message: string }>
      novelty?: import('./api.types.js').SyncNoveltySummary
      result?: {
        exams: number
        medicalRecords: number
        authorizations: number
        authorizationItems: number
        updatedAuthorizations: number
        total: number
        warnings?: string[]
        novelty?: import('./api.types.js').SyncNoveltySummary
        authorizationDetails: Array<{
          solicitationNumber?: string
          classification?: string
          doctorName?: string
          itemCount: number
          action: 'created' | 'updated'
          linkedConsultaId?: string
          linkedConsultaDate?: string
        }>
      }
    }>(`/integration-links/sync-progress/${jobId}`),
  },
  planMemberships: {
    list: (patientId: string) => request<import('./api.types.js').PlanMembershipWithPlan[]>(`/plan-memberships?patientId=${patientId}`),
  },
  healthThreads: {
    list: (patientId: string, activeOnly = true) =>
      request<import('./api.types.js').HealthThread[]>(
        `/health-threads?patientId=${patientId}${activeOnly ? '&activeOnly=true' : ''}`,
      ),
    create: (data: object) =>
      request<import('./api.types.js').HealthThread>('/health-threads', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) =>
      request<import('./api.types.js').HealthThread>(`/health-threads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    close: (id: string, status: 'resolved' | 'ruled_out' | 'converted') =>
      request<import('./api.types.js').HealthThread>(`/health-threads/${id}/close`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
    delete: (id: string) => request<void>(`/health-threads/${id}`, { method: 'DELETE' }),
    wizardInvestigation: (data: object) =>
      request<import('./api.types.js').HealthThread>('/health-threads/wizard/investigation', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    wizardTask: (data: object) =>
      request<import('./api.types.js').HealthThread>('/health-threads/wizard/task', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    detail: (id: string) =>
      request<import('./api.types.js').HealthThreadDetail>(`/health-threads/${id}/detail`),
    addEntry: (id: string, body: string) =>
      request(`/health-threads/${id}/entries`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    createExam: (id: string, data: object) =>
      request<{ exam: import('./api.types.js').Exam; link: unknown }>(
        `/health-threads/${id}/artifacts/exam`,
        { method: 'POST', body: JSON.stringify(data) },
      ),
    linkArtifact: (id: string, data: object) =>
      request(`/health-threads/${id}/links`, { method: 'POST', body: JSON.stringify(data) }),
    createMedicalRecord: (id: string, data: object) =>
      request(`/health-threads/${id}/artifacts/medical-record`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createAuthorization: (id: string, data: object) =>
      request(`/health-threads/${id}/artifacts/authorization`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createMedication: (id: string, data: object) =>
      request(`/health-threads/${id}/artifacts/medication`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createVaccine: (id: string, data: object) =>
      request(`/health-threads/${id}/artifacts/vaccine`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    convertAllergy: (id: string, data: object) =>
      request(`/health-threads/${id}/convert/allergy`, { method: 'POST', body: JSON.stringify(data) }),
    convertDiagnosis: (id: string, data: object) =>
      request(`/health-threads/${id}/convert/diagnosis`, { method: 'POST', body: JSON.stringify(data) }),
    clinicalFlow: (id: string) =>
      request<import('./api.types.js').ClinicalFlow>(`/health-threads/${id}/clinical-flow`),
  },
  clinicalLinks: {
    relationTypes: (fromEntityType?: string, toEntityType?: string) => {
      const params = new URLSearchParams()
      if (fromEntityType) params.set('fromEntityType', fromEntityType)
      if (toEntityType) params.set('toEntityType', toEntityType)
      const q = params.toString()
      return request<import('./api.types.js').RelationType[]>(
        `/relation-types${q ? `?${q}` : ''}`,
      )
    },
    list: (patientId: string, entityType?: string, entityId?: string) => {
      const params = new URLSearchParams()
      if (entityType) params.set('entityType', entityType)
      if (entityId) params.set('entityId', entityId)
      const q = params.toString()
      return request<import('./api.types.js').ClinicalEntityLink[]>(
        `/patients/${patientId}/clinical-links${q ? `?${q}` : ''}`,
      )
    },
    create: (patientId: string, data: object) =>
      request<import('./api.types.js').ClinicalEntityLink>(`/patients/${patientId}/clinical-links`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    counts: (patientId: string) =>
      request<import('./api.types.js').ClinicalLinkCount[]>(
        `/patients/${patientId}/clinical-link-counts`,
      ),
    delete: (id: string) => request<void>(`/clinical-links/${id}`, { method: 'DELETE' }),
  },
  scraper: {
    conectesus: (data: { cpf: string }) =>
      request<import('./api.types.js').ScraperResult>('/scraper/conectesus', { method: 'POST', body: JSON.stringify(data) }),
    caderneta: () =>
      request<import('./api.types.js').ScraperResult>('/scraper/caderneta', { method: 'POST', body: JSON.stringify({}) }),
    unimed: (data: { email: string; password: string; insuranceMembershipNumber?: string }) =>
      request<import('./api.types.js').ScraperResult>('/scraper/unimed', { method: 'POST', body: JSON.stringify(data) }),
    amil: (data: { cpf: string; password: string; insuranceMembershipNumber?: string }) =>
      request<import('./api.types.js').ScraperResult>('/scraper/amil', { method: 'POST', body: JSON.stringify(data) }),
    bradesco: (data: { cpf: string; password: string; insuranceMembershipNumber?: string }) =>
      request<import('./api.types.js').ScraperResult>('/scraper/bradesco_saude', { method: 'POST', body: JSON.stringify(data) }),
  },
  auth: {
    me: () => request<import('./api.types.js').AuthSyncResponse>('/auth/me'),
    sync: () => request<import('./api.types.js').AuthSyncResponse>('/auth/sync', { method: 'POST' }),
    completeProfile: (data: import('./api.types.js').CompleteProfileInput) =>
      request<{ patient: import('./api.types.js').Patient; needsProfile: false }>(
        '/auth/complete-profile',
        { method: 'POST', body: JSON.stringify(data) },
      ),
    deleteAccount: (body: { confirmPhrase: 'EXCLUIR' }) =>
      request<{ ok: boolean; deletedPatientIds: string[]; removedMemberships: number }>(
        '/auth/account',
        { method: 'DELETE', body: JSON.stringify(body) },
      ),
    getProfile: () => request<import('./api.types.js').AccountProfileView>('/auth/profile'),
    updateProfile: (data: import('./api.types.js').UpdateAccountProfileInput) =>
      request<import('./api.types.js').AccountProfileView>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  project: {
    context: () => request<import('./api.types.js').ProjectContext>('/project/context'),
  },
  compliance: {
    listDocuments: () =>
      request<{ documents: import('./api.types.js').LegalDocumentView[] }>('/compliance/documents'),
    getCurrent: (kind: import('./api.types.js').LegalDocumentKind) =>
      request<import('./api.types.js').LegalDocumentWithContent>(`/compliance/documents/${kind}/current`),
    status: () => request<import('./api.types.js').ComplianceStatus>('/compliance/status'),
    contact: () => request<import('./api.types.js').ComplianceContactInfo>('/compliance/contact'),
    goLiveStatus: () => request<import('./api.types.js').GoLiveStatus>('/compliance/go-live-status'),
    accept: (body?: { kinds?: import('./api.types.js').LegalDocumentKind[]; documentIds?: string[] }) =>
      request<import('./api.types.js').ComplianceStatus>('/compliance/accept', {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      }),
  },
}
