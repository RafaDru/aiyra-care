import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'

export interface SyncAuthorizationDetail {
  solicitationNumber?: string
  classification?: string
  doctorName?: string
  itemCount: number
  action: 'created' | 'updated'
  linkedConsultaId?: string
  linkedConsultaDate?: string
}

export interface SyncResult {
  exams: number
  medicalRecords: number
  authorizations: number
  authorizationItems: number
  updatedAuthorizations: number
  total: number
  authorizationDetails: SyncAuthorizationDetail[]
}

export interface SyncJob {
  progress: ScraperProgress
  result?: SyncResult
}

const jobs = new Map<string, SyncJob>()

export function createJob(): string {
  const id = crypto.randomUUID()
  jobs.set(id, { progress: { step: 'pending', message: 'Aguardando...', status: 'running' } })
  return id
}

export function updateJob(id: string, progress: ScraperProgress, result?: SyncResult) {
  jobs.set(id, { progress, result })
}

export function getJob(id: string): { progress: ScraperProgress; result?: SyncResult } | undefined {
  return jobs.get(id)
}

export function removeJob(id: string) {
  jobs.delete(id)
}
