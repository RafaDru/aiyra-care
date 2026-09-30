import type {
  CreatePlatformDefectInput,
  PlatformDefectIncidentLinkedBy,
  PlatformDefectRecord,
  PlatformDefectStatus,
} from '../../domain/ops/platform-defect.types.js'
import type { PlatformDefectPgRepository } from '../../infrastructure/persistence/platform-defect.pg.repository.js'

const ALLOWED: Record<PlatformDefectStatus, PlatformDefectStatus[]> = {
  open: ['in_fix'],
  in_fix: ['ready_for_pr'],
  ready_for_pr: ['fixed'],
  fixed: [],
}

export class PlatformDefectTransitionError extends Error {
  readonly code: 'invalid_transition' | 'not_found'

  constructor(code: 'invalid_transition' | 'not_found') {
    super(code)
    this.code = code
  }
}

export class PlatformDefectService {
  constructor(private readonly repo: PlatformDefectPgRepository) {}

  listForOps(options: {
    statusFilter?: string
    includeFixed?: boolean
    limit?: number
  } = {}): Promise<PlatformDefectRecord[]> {
    const statuses = options.statusFilter
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) as PlatformDefectStatus[] | undefined
    return this.repo.listForOps({
      statuses: statuses?.length ? statuses : undefined,
      includeFixed: options.includeFixed,
      limit: options.limit,
    })
  }

  async getDetail(id: string) {
    return this.repo.findByIdWithIncidents(id)
  }

  async createFromTriage(
    input: CreatePlatformDefectInput,
    incidentId: string,
    linkedBy: PlatformDefectIncidentLinkedBy = 'agent_triage',
  ): Promise<PlatformDefectRecord> {
    if (input.fingerprint) {
      const existing = await this.repo.findOpenByFingerprint(input.fingerprint)
      if (existing) {
        await this.repo.linkIncident(existing.id, incidentId, linkedBy)
        return existing
      }
    }
    const defect = await this.repo.insert(input)
    await this.repo.linkIncident(defect.id, incidentId, linkedBy)
    return defect
  }

  async linkIncident(
    defectId: string,
    incidentId: string,
    linkedBy: PlatformDefectIncidentLinkedBy,
  ): Promise<void> {
    const defect = await this.repo.findById(defectId)
    if (!defect) throw new PlatformDefectTransitionError('not_found')
    await this.repo.linkIncident(defectId, incidentId, linkedBy)
  }

  async startFix(id: string): Promise<PlatformDefectRecord> {
    return this.transition(id, 'in_fix')
  }

  async transition(
    id: string,
    nextStatus: PlatformDefectStatus,
    meta?: { branchName?: string | null; prUrl?: string | null; skipBatch?: boolean },
  ): Promise<PlatformDefectRecord> {
    const current = await this.repo.findById(id)
    if (!current) throw new PlatformDefectTransitionError('not_found')

    const allowed = ALLOWED[current.status]
    if (!allowed.includes(nextStatus)) {
      throw new PlatformDefectTransitionError('invalid_transition')
    }
    void meta?.skipBatch

    const updated = await this.repo.updateStatus(id, nextStatus, {
      branchName: meta?.branchName,
      prUrl: meta?.prUrl,
    })
    if (!updated) throw new PlatformDefectTransitionError('not_found')
    return updated
  }
}
