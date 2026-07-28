const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData
  const headers: Record<string, string> = options?.body && !isFormData ? { 'Content-Type': 'application/json' } : {}
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { ...headers, ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  patients: {
    list: () => request<import('./api.types.js').Patient[]>('/patients'),
    get: (id: string) => request<import('./api.types.js').Patient>(`/patients/${id}`),
    create: (data: object) => request<import('./api.types.js').Patient>('/patients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) => request<import('./api.types.js').Patient>(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/patients/${id}`, { method: 'DELETE' }),
  },
  growthRecords: {
    list: (patientId?: string) => request<import('./api.types.js').GrowthRecord[]>(`/growth-records${patientId ? `?patientId=${patientId}` : ''}`),
    create: (data: object) => request<import('./api.types.js').GrowthRecord>('/growth-records', { method: 'POST', body: JSON.stringify(data) }),
  },
  vaccines: {
    list: (patientId?: string) => request<import('./api.types.js').Vaccine[]>(`/vaccines${patientId ? `?patientId=${patientId}` : ''}`),
    create: (data: object) => request<import('./api.types.js').Vaccine>('/vaccines', { method: 'POST', body: JSON.stringify(data) }),
  },
  medications: {
    list: (patientId?: string) => request<import('./api.types.js').Medication[]>(`/medications${patientId ? `?patientId=${patientId}` : ''}`),
    create: (data: object) => request<import('./api.types.js').Medication>('/medications', { method: 'POST', body: JSON.stringify(data) }),
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
  integrationLinks: {
    list: (patientId: string) => request<import('./api.types.js').IntegrationLink[]>(`/integration-links?patientId=${patientId}`),
    create: (data: object) => request<import('./api.types.js').IntegrationLink>('/integration-links', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) => request<import('./api.types.js').IntegrationLink>(`/integration-links/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/integration-links/${id}`, { method: 'DELETE' }),
    sync: (id: string) => request<{ jobId: string }>(`/integration-links/${id}/sync`, { method: 'POST' }),
    syncProgress: (jobId: string) => request<{
      step: string
      message: string
      status: string
      result?: {
        exams: number
        medicalRecords: number
        authorizations: number
        authorizationItems: number
        updatedAuthorizations: number
        total: number
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
  scraper: {
    conectesus: (data: { cpf: string }) =>
      request<import('./api.types.js').ScraperResult>('/scraper/conectesus', { method: 'POST', body: JSON.stringify(data) }),
    unimed: (data: { email: string; password: string; insuranceMembershipNumber?: string }) =>
      request<import('./api.types.js').ScraperResult>('/scraper/unimed', { method: 'POST', body: JSON.stringify(data) }),
    amil: (data: { cpf: string; password: string; insuranceMembershipNumber?: string }) =>
      request<import('./api.types.js').ScraperResult>('/scraper/amil', { method: 'POST', body: JSON.stringify(data) }),
    bradesco: (data: { cpf: string; password: string; insuranceMembershipNumber?: string }) =>
      request<import('./api.types.js').ScraperResult>('/scraper/bradesco_saude', { method: 'POST', body: JSON.stringify(data) }),
  },
}
