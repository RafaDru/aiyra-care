/** Em dev o Vite faz proxy à API (porta 3010). Não usar localhost:3000 — conflita com outros apps. */
const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:3010')

export function documentDownloadUrl(documentId: string): string {
  return `${BASE_URL}/documents/${documentId}/download`
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
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string; code?: string; error?: unknown }
    const zodMsg = body.error && typeof body.error === 'object' && 'fieldErrors' in (body.error as object)
      ? JSON.stringify(body.error)
      : undefined
    throw new Error(body.message || zodMsg || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  patients: {
    list: () => request<import('./api.types.js').Patient[]>('/patients'),
    get: (id: string) => request<import('./api.types.js').Patient>(`/patients/${id}`),
    context: (id: string, timelineMonths?: number) =>
      request<import('./api.types.js').PatientContext>(
        `/patients/${id}/context${timelineMonths ? `?timelineMonths=${timelineMonths}` : ''}`,
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
  documents: {
    list: (patientId?: string) => request<import('./api.types.js').Document_[]>(`/documents${patientId ? `?patientId=${patientId}` : ''}`),
    create: (data: object) => request<import('./api.types.js').Document_>('/documents', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) => request<import('./api.types.js').Document_>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/documents/${id}`, { method: 'DELETE' }),
    ocrStats: () => request<{ summary: Record<string, unknown>; byType: unknown[] }>('/documents/ocr-stats'),
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
  },
  project: {
    context: () => request<import('./api.types.js').ProjectContext>('/project/context'),
  },
}
