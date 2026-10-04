import type {
  CreatePlatformDefectFromTriageContext,
  CreatePlatformDefectInput,
  PlatformDefectIncidentLinkedBy,
  PlatformDefectRecord,
  PlatformDefectStatus,
} from '../../domain/ops/platform-defect.types.js'
import {
  parseCorrectionFailureDetails,
  summarizeCorrectionFailure,
} from '../../domain/ops/platform-defect-correction-failure.js'
import type { AgentAnalysisCallbackInput } from '../../domain/ops/ops-analysis-queue.types.js'
import { isGithubPullRequestUrl } from '../../domain/ops/platform-defect-pr-url.js'
import { resolveRecurrenceParentId } from '../../domain/ops/platform-defect-recurrence.js'
import type { PlatformDefectPgRepository } from '../../infrastructure/persistence/platform-defect.pg.repository.js'

const ALLOWED: Record<PlatformDefectStatus, PlatformDefectStatus[]> = {
  open: ['in_fix'],
  in_fix: ['ready_for_pr', 'open'],
  ready_for_pr: ['fixed'],
  fixed: [],
}

export class PlatformDefectTransitionError extends Error {
  readonly code:
    | 'invalid_transition'
    | 'not_found'
    | 'pr_url_required'
    | 'failure_details_required'

  constructor(
    code: 'invalid_transition' | 'not_found' | 'pr_url_required' | 'failure_details_required',
  ) {
    super(code)
    this.code = code
  }
}

export function assertGithubPrUrlForReadyForPr(prUrl: string | null | undefined): void {
  if (!isGithubPullRequestUrl(prUrl)) {
    throw new PlatformDefectTransitionError('pr_url_required')
  }
}

export class PlatformDefectService {
  constructor(
    private readonly repo: PlatformDefectPgRepository,
    private readonly onDefectFixed?: (defectId: string) => Promise<void>,
  ) {}

  async listForOps(options: {
    statusFilter?: string
    includeFixed?: boolean
    limit?: number
  } = {}): Promise<PlatformDefectRecord[]> {
    const statuses = options.statusFilter
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) as PlatformDefectStatus[] | undefined
    const items = await this.repo.listForOps({
      statuses: statuses?.length ? statuses : undefined,
      includeFixed: options.includeFixed,
      limit: options.limit,
    })
    const { reconcileUntruthfulDefectsInList } = await import('./platform-defect-in-fix-reconcile.js')
    return reconcileUntruthfulDefectsInList(this, items)
  }

  async getDetail(id: string) {
    const { reconcileDefectByIdIfNeeded } = await import('./platform-defect-in-fix-reconcile.js')
    await reconcileDefectByIdIfNeeded(this, this.repo, id)
    return this.repo.findByIdWithIncidents(id)
  }

  findByReferenceCode(referenceCode: string): Promise<PlatformDefectRecord | null> {
    return this.repo.findByReferenceCode(referenceCode)
  }

  searchForOps(query: string, limit = 50): Promise<PlatformDefectRecord[]> {
    return this.repo.searchForOps(query, limit)
  }

  async createFromTriage(
    input: CreatePlatformDefectInput,
    incidentId: string,
    linkedBy: PlatformDefectIncidentLinkedBy = 'agent_triage',
    context?: CreatePlatformDefectFromTriageContext,
  ): Promise<PlatformDefectRecord> {
    if (input.fingerprint) {
      const existing = await this.repo.findOpenByFingerprint(input.fingerprint)
      if (existing) {
        await this.repo.linkIncident(existing.id, incidentId, linkedBy)
        return existing
      }
    }

    const incidentSeenAt = context?.incidentSeenAt ?? new Date().toISOString()
    const explicitParentId = context?.parentDefectId?.trim() || null
    if (context?.recurrenceLikely && !input.fingerprint && !explicitParentId) {
      throw new PlatformDefectTransitionError('invalid_transition')
    }

    const fixedByFingerprint = input.fingerprint
      ? await this.repo.findLatestFixedByFingerprint(input.fingerprint)
      : null
    const explicitParent = explicitParentId ? await this.repo.findById(explicitParentId) : null

    const parentDefectId = resolveRecurrenceParentId({
      incidentSeenAt,
      fixedByFingerprint,
      explicitParentId,
      explicitParent,
    })

    const defect = await this.repo.insert({
      ...input,
      parentDefectId,
    })
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

  /** Somente após `dispatch.outcome === sent` (via start-fix). */
  async startFix(id: string): Promise<PlatformDefectRecord> {
    const current = await this.repo.findById(id)
    if (!current) throw new PlatformDefectTransitionError('not_found')
    if (current.status !== 'open') {
      throw new PlatformDefectTransitionError('invalid_transition')
    }
    const updated = await this.repo.updateStatus(id, 'in_fix', { markFixDispatchSent: true })
    if (!updated) throw new PlatformDefectTransitionError('not_found')
    return updated
  }

  async revertStaleInFix(id: string): Promise<PlatformDefectRecord> {
    const current = await this.repo.findById(id)
    if (!current) throw new PlatformDefectTransitionError('not_found')
    if (current.status !== 'in_fix') return current
    const updated = await this.repo.updateStatus(id, 'open', { clearFixProgress: true })
    if (!updated) throw new PlatformDefectTransitionError('not_found')
    return updated
  }

  async transition(
    id: string,
    nextStatus: PlatformDefectStatus,
    meta?: { branchName?: string | null; prUrl?: string | null; skipBatch?: boolean },
  ): Promise<PlatformDefectRecord> {
    const current = await this.repo.findById(id)
    if (!current) throw new PlatformDefectTransitionError('not_found')

    if (nextStatus === 'in_fix') {
      throw new PlatformDefectTransitionError('invalid_transition')
    }

    const allowed = ALLOWED[current.status]
    if (!allowed.includes(nextStatus)) {
      throw new PlatformDefectTransitionError('invalid_transition')
    }
    void meta?.skipBatch

    if (nextStatus === 'ready_for_pr') {
      const effectivePrUrl = meta?.prUrl !== undefined ? meta.prUrl : current.prUrl
      assertGithubPrUrlForReadyForPr(effectivePrUrl)
    }

    const updated = await this.repo.updateStatus(id, nextStatus, {
      branchName: meta?.branchName,
      prUrl: meta?.prUrl,
      clearFixProgress: current.status === 'in_fix' && nextStatus === 'open',
      fixedVia: nextStatus === 'fixed' ? 'manual' : undefined,
    })
    if (!updated) throw new PlatformDefectTransitionError('not_found')
    if (nextStatus === 'fixed') {
      await this.onDefectFixed?.(id)
    }
    return updated
  }

  async applyAgentStatusCallback(input: AgentAnalysisCallbackInput): Promise<PlatformDefectRecord> {
    const defectId = input.defectId?.trim()
    const defectStatus = input.defectStatus
    if (!defectId || !defectStatus) {
      throw new PlatformDefectTransitionError('invalid_transition')
    }

    if (defectStatus === 'correction_failed') {
      const failureDetails = parseCorrectionFailureDetails(input.failureDetails)
      if (!failureDetails) {
        throw new PlatformDefectTransitionError('failure_details_required')
      }
      const summary =
        summarizeCorrectionFailure(failureDetails) ||
        input.remediationSummary?.slice(0, 2000) ||
        failureDetails.message
      const updated = await this.repo.recordCorrectionFailure(defectId, {
        failureKind: 'callback',
        failureSummary: summary,
        failureDetails,
      })
      if (!updated) {
        const exists = await this.repo.findById(defectId)
        if (!exists) throw new PlatformDefectTransitionError('not_found')
        throw new PlatformDefectTransitionError('invalid_transition')
      }
      return updated
    }

    if (defectStatus === 'ready_for_pr') {
      assertGithubPrUrlForReadyForPr(input.prUrl)
    }

    const nextStatus = defectStatus as PlatformDefectStatus
    return this.transition(defectId, nextStatus, {
      branchName: input.branchName ?? null,
      prUrl: input.prUrl ?? null,
    })
  }
}
