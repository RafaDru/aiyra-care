import type { SyncResult } from '../../infrastructure/scraper/sync-progress-store.js'
import type { SyncablePortalType } from '../scraper/sync-portal-profile.js'

export type SyncJobStatus = 'pending' | 'running' | 'success' | 'failed'
export type SyncJobTrigger = 'manual' | 'scheduled'

export interface SyncNoveltySummary {
  portalExams?: number
  portalAttendances?: number
  portalMedicalRecords?: number
  portalAuthorizations?: number
  newExamRecords?: number
  skippedExamRecords?: number
  skippedMedicalRecords?: number
  skippedAuthorizations?: number
  filesDownloaded?: number
  filesSkipped?: number
  newAuthorizations?: number
  updatedAuthorizations?: number
  newMedicalRecords?: number
}

import type { PortalAuthFailureKind } from '../../domain/portal-auth/portal-auth-failure.js'

export interface SyncJobProps {
  id: string
  integrationLinkId: string
  portalType: SyncablePortalType | string
  trigger: SyncJobTrigger
  status: SyncJobStatus
  step: string | null
  message: string | null
  stepDetails: Record<string, { status: string; message: string }>
  result: SyncResult | null
  novelty: SyncNoveltySummary | null
  error: string | null
  failureKind: PortalAuthFailureKind | null
  startedAt: Date
  finishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class SyncJob {
  private constructor(private readonly data: SyncJobProps) {}

  static create(args: {
    id: string
    integrationLinkId: string
    portalType: string
    trigger?: SyncJobTrigger
  }): SyncJob {
    const now = new Date()
    return new SyncJob({
      id: args.id,
      integrationLinkId: args.integrationLinkId,
      portalType: args.portalType,
      trigger: args.trigger ?? 'manual',
      status: 'running',
      step: 'pending',
      message: 'Aguardando...',
      stepDetails: {},
      result: null,
      novelty: null,
      error: null,
      failureKind: null,
      startedAt: now,
      finishedAt: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  static restore(props: SyncJobProps): SyncJob {
    return new SyncJob(props)
  }

  toJSON(): SyncJobProps {
    return { ...this.data }
  }

  get id(): string { return this.data.id }
  get integrationLinkId(): string { return this.data.integrationLinkId }
  get status(): SyncJobStatus { return this.data.status }
}
