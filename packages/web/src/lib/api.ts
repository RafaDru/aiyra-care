const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
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
  },
  medicalRecords: {
    list: (patientId?: string) => request<import('./api.types.js').MedicalRecord[]>(`/medical-records${patientId ? `?patientId=${patientId}` : ''}`),
    create: (data: object) => request<import('./api.types.js').MedicalRecord>('/medical-records', { method: 'POST', body: JSON.stringify(data) }),
  },
  diagnoses: {
    list: (patientId?: string) => request<import('./api.types.js').Diagnosis[]>(`/diagnoses${patientId ? `?patientId=${patientId}` : ''}`),
    create: (data: object) => request<import('./api.types.js').Diagnosis>('/diagnoses', { method: 'POST', body: JSON.stringify(data) }),
  },
}
