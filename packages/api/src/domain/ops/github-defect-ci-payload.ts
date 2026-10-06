import type { DefectPipelineStatus } from './platform-defect-pipeline.types.js'
import { normalizeGithubPrUrlForMatch } from './platform-defect-pr-url.js'

type GithubRepoRef = { full_name?: string; name?: string; owner?: { login?: string } }

type GithubPullRequestRef = { html_url?: string; url?: string }

export type GithubWorkflowRunPayload = {
  action?: string
  repository?: GithubRepoRef
  workflow_run?: {
    status?: string
    conclusion?: string | null
    html_url?: string
    pull_requests?: GithubPullRequestRef[]
    head_branch?: string
  }
}

export type GithubCheckRunPayload = {
  action?: string
  repository?: GithubRepoRef
  check_run?: {
    status?: string
    conclusion?: string | null
    details_url?: string
    html_url?: string
    name?: string
    pull_requests?: GithubPullRequestRef[]
    check_suite?: { conclusion?: string | null }
  }
}

export type ParsedGithubDefectCiEvent = {
  eligible: boolean
  reason?: string
  eventKind: 'workflow_run' | 'check_run' | null
  repoFullName: string | null
  pullRequestUrls: string[]
  pipelineStatus: DefectPipelineStatus | null
  runUrl: string | null
  snapshot: Record<string, unknown>
  failedJobs: string[]
  isTerminalFailure: boolean
  isTerminalSuccess: boolean
}

function repoFullName(repo: GithubRepoRef | undefined): string | null {
  if (!repo) return null
  if (repo.full_name?.trim()) return repo.full_name.trim()
  const owner = repo.owner?.login?.trim()
  const name = repo.name?.trim()
  if (owner && name) return `${owner}/${name}`
  return null
}

function collectPullRequestUrls(pulls: GithubPullRequestRef[] | undefined): string[] {
  const out = new Set<string>()
  for (const pr of pulls ?? []) {
    const normalized = normalizeGithubPrUrlForMatch(pr.html_url ?? pr.url)
    if (normalized) out.add(normalized)
  }
  return [...out]
}

function mapWorkflowPipeline(
  status: string | undefined,
  conclusion: string | null | undefined,
): { pipelineStatus: DefectPipelineStatus | null; isTerminalFailure: boolean; isTerminalSuccess: boolean } {
  if (status === 'queued' || status === 'requested' || status === 'waiting') {
    return { pipelineStatus: 'ci_pending', isTerminalFailure: false, isTerminalSuccess: false }
  }
  if (status === 'in_progress') {
    return { pipelineStatus: 'ci_running', isTerminalFailure: false, isTerminalSuccess: false }
  }
  if (status !== 'completed') {
    return { pipelineStatus: null, isTerminalFailure: false, isTerminalSuccess: false }
  }
  if (conclusion === 'success') {
    return { pipelineStatus: 'ci_success', isTerminalFailure: false, isTerminalSuccess: true }
  }
  if (conclusion === 'failure' || conclusion === 'timed_out' || conclusion === 'cancelled' || conclusion === 'action_required') {
    return { pipelineStatus: 'ci_failed', isTerminalFailure: true, isTerminalSuccess: false }
  }
  return { pipelineStatus: 'ci_running', isTerminalFailure: false, isTerminalSuccess: false }
}

function mapCheckRunPipeline(
  status: string | undefined,
  conclusion: string | null | undefined,
): { pipelineStatus: DefectPipelineStatus | null; isTerminalFailure: boolean; isTerminalSuccess: boolean } {
  if (status === 'queued' || status === 'requested') {
    return { pipelineStatus: 'ci_pending', isTerminalFailure: false, isTerminalSuccess: false }
  }
  if (status === 'in_progress') {
    return { pipelineStatus: 'ci_running', isTerminalFailure: false, isTerminalSuccess: false }
  }
  if (status !== 'completed') {
    return { pipelineStatus: null, isTerminalFailure: false, isTerminalSuccess: false }
  }
  if (conclusion === 'success' || conclusion === 'neutral' || conclusion === 'skipped') {
    return { pipelineStatus: 'ci_success', isTerminalFailure: false, isTerminalSuccess: true }
  }
  if (conclusion === 'failure' || conclusion === 'timed_out' || conclusion === 'cancelled' || conclusion === 'action_required') {
    return { pipelineStatus: 'ci_failed', isTerminalFailure: true, isTerminalSuccess: false }
  }
  return { pipelineStatus: 'ci_running', isTerminalFailure: false, isTerminalSuccess: false }
}

export function parseGithubDefectCiEvent(payload: unknown): ParsedGithubDefectCiEvent {
  const body = (payload ?? {}) as GithubWorkflowRunPayload & GithubCheckRunPayload

  if (body.workflow_run) {
    const run = body.workflow_run
    const mapped = mapWorkflowPipeline(run.status, run.conclusion)
    const pullRequestUrls = collectPullRequestUrls(run.pull_requests)
    const runUrl = run.html_url?.trim() || null
    const failedJobs =
      mapped.isTerminalFailure && run.head_branch ? [run.head_branch] : []
    return {
      eligible: Boolean(mapped.pipelineStatus && pullRequestUrls.length),
      reason: !pullRequestUrls.length ? 'no_pull_request' : mapped.pipelineStatus ? undefined : 'unsupported_status',
      eventKind: 'workflow_run',
      repoFullName: repoFullName(body.repository),
      pullRequestUrls,
      pipelineStatus: mapped.pipelineStatus,
      runUrl,
      snapshot: {
        kind: 'workflow_run',
        action: body.action ?? null,
        status: run.status ?? null,
        conclusion: run.conclusion ?? null,
        headBranch: run.head_branch ?? null,
      },
      failedJobs,
      isTerminalFailure: mapped.isTerminalFailure,
      isTerminalSuccess: mapped.isTerminalSuccess,
    }
  }

  if (body.check_run) {
    const check = body.check_run
    const mapped = mapCheckRunPipeline(check.status, check.conclusion)
    const pullRequestUrls = collectPullRequestUrls(check.pull_requests)
    const runUrl = check.details_url?.trim() || check.html_url?.trim() || null
    const failedJobs =
      mapped.isTerminalFailure && check.name?.trim() ? [check.name.trim()] : []
    return {
      eligible: Boolean(mapped.pipelineStatus && pullRequestUrls.length),
      reason: !pullRequestUrls.length ? 'no_pull_request' : mapped.pipelineStatus ? undefined : 'unsupported_status',
      eventKind: 'check_run',
      repoFullName: repoFullName(body.repository),
      pullRequestUrls,
      pipelineStatus: mapped.pipelineStatus,
      runUrl,
      snapshot: {
        kind: 'check_run',
        action: body.action ?? null,
        status: check.status ?? null,
        conclusion: check.conclusion ?? null,
        name: check.name ?? null,
        suiteConclusion: check.check_suite?.conclusion ?? null,
      },
      failedJobs,
      isTerminalFailure: mapped.isTerminalFailure,
      isTerminalSuccess: mapped.isTerminalSuccess,
    }
  }

  return {
    eligible: false,
    reason: 'unknown_event',
    eventKind: null,
    repoFullName: repoFullName(body.repository),
    pullRequestUrls: [],
    pipelineStatus: null,
    runUrl: null,
    snapshot: {},
    failedJobs: [],
    isTerminalFailure: false,
    isTerminalSuccess: false,
  }
}
