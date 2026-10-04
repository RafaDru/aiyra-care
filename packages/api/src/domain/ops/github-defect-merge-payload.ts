import { normalizeDefectReferenceCode } from './incident-list-filter.js'
import { normalizeGithubPrUrlForMatch } from './platform-defect-pr-url.js'

const DEF_REF = /\b(DEF-\d{6})\b/gi
const UUID =
  /\b([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\b/gi

export type GithubPullRequestClosedPayload = {
  action?: string
  pull_request?: {
    merged?: boolean
    html_url?: string
    body?: string | null
    labels?: Array<{ name?: string }>
    base?: { ref?: string }
  }
}

export function parseGithubDefectMergeEvent(payload: GithubPullRequestClosedPayload): {
  eligible: boolean
  mergedPrUrl: string | null
  referenceCodes: string[]
  defectIds: string[]
  baseRef: string | null
  reason?: 'not_closed' | 'not_merged' | 'missing_pr_url'
} {
  if (payload.action !== 'closed') {
    return {
      eligible: false,
      mergedPrUrl: null,
      referenceCodes: [],
      defectIds: [],
      baseRef: null,
      reason: 'not_closed',
    }
  }
  const pr = payload.pull_request
  if (!pr?.merged) {
    return {
      eligible: false,
      mergedPrUrl: null,
      referenceCodes: [],
      defectIds: [],
      baseRef: pr?.base?.ref ?? null,
      reason: 'not_merged',
    }
  }
  const mergedPrUrl = normalizeGithubPrUrlForMatch(pr.html_url)
  if (!mergedPrUrl) {
    return {
      eligible: false,
      mergedPrUrl: null,
      referenceCodes: [],
      defectIds: [],
      baseRef: pr.base?.ref ?? null,
      reason: 'missing_pr_url',
    }
  }

  const referenceCodes = new Set<string>()
  const defectIds = new Set<string>()

  const body = pr.body ?? ''
  for (const match of body.matchAll(DEF_REF)) {
    const normalized = normalizeDefectReferenceCode(match[1])
    if (normalized) referenceCodes.add(normalized)
  }
  for (const match of body.matchAll(UUID)) {
    defectIds.add(match[1].toLowerCase())
  }
  for (const label of pr.labels ?? []) {
    const name = label.name?.trim() ?? ''
    const ref = normalizeDefectReferenceCode(name)
    if (ref) referenceCodes.add(ref)
    const uuidMatch = UUID.exec(name)
    UUID.lastIndex = 0
    if (uuidMatch) defectIds.add(uuidMatch[1].toLowerCase())
  }

  return {
    eligible: true,
    mergedPrUrl,
    referenceCodes: [...referenceCodes],
    defectIds: [...defectIds],
    baseRef: pr.base?.ref ?? null,
  }
}
