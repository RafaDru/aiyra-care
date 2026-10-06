import type { ParsedGithubPullRequestUrl } from '../../domain/ops/platform-defect-pr-url.js'

type GithubPullHead = { sha?: string }

type GithubWorkflowRun = {
  status?: string
  conclusion?: string | null
  html_url?: string
  head_branch?: string
  updated_at?: string
}

type GithubWorkflowRunsResponse = {
  workflow_runs?: GithubWorkflowRun[]
}

export type GithubCiPollFetchResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; reason: string }

function authHeaders(token: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function pickWorkflowRun(runs: GithubWorkflowRun[]): GithubWorkflowRun | null {
  if (!runs.length) return null
  const inProgress = runs.find((r) => r.status === 'in_progress' || r.status === 'queued')
  if (inProgress) return inProgress
  const completed = runs
    .filter((r) => r.status === 'completed')
    .sort((a, b) => {
      const at = a.updated_at ? Date.parse(a.updated_at) : 0
      const bt = b.updated_at ? Date.parse(b.updated_at) : 0
      return bt - at
    })
  return completed[0] ?? runs[0]
}

export async function fetchGithubCiWebhookPayloadForPullRequest(
  pr: ParsedGithubPullRequestUrl,
  options: {
    token: string
    repoFullName?: string
    fetchImpl?: typeof fetch
  },
): Promise<GithubCiPollFetchResult> {
  const fetchImpl = options.fetchImpl ?? fetch
  const repoFullName = options.repoFullName?.trim() || `${pr.owner}/${pr.repo}`
  const pullUrl = `https://api.github.com/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}`

  const pullRes = await fetchImpl(pullUrl, { headers: authHeaders(options.token) })
  if (!pullRes.ok) {
    return { ok: false, reason: `pull_request_http_${pullRes.status}` }
  }
  const pullBody = (await pullRes.json()) as GithubPullHead
  const headSha = pullBody.sha?.trim()
  if (!headSha) {
    return { ok: false, reason: 'pull_request_missing_head_sha' }
  }

  const runsUrl =
    `https://api.github.com/repos/${pr.owner}/${pr.repo}/actions/runs?head_sha=${encodeURIComponent(headSha)}&per_page=20`
  const runsRes = await fetchImpl(runsUrl, { headers: authHeaders(options.token) })
  if (!runsRes.ok) {
    return { ok: false, reason: `workflow_runs_http_${runsRes.status}` }
  }
  const runsBody = (await runsRes.json()) as GithubWorkflowRunsResponse
  const run = pickWorkflowRun(runsBody.workflow_runs ?? [])
  if (!run) {
    return { ok: false, reason: 'no_workflow_runs' }
  }

  const payload: Record<string, unknown> = {
    repository: { full_name: repoFullName },
    workflow_run: {
      status: run.status ?? null,
      conclusion: run.conclusion ?? null,
      html_url: run.html_url ?? null,
      head_branch: run.head_branch ?? null,
      pull_requests: [{ html_url: pr.htmlUrl }],
    },
  }
  return { ok: true, payload }
}
