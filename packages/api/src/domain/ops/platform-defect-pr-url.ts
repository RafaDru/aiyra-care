/** GitHub pull request URL required before `ready_for_pr`. */
const GITHUB_PR_URL =
  /^https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/\d+\/?(?:\?.*)?$/i

export function isGithubPullRequestUrl(value: string | null | undefined): boolean {
  if (value == null) return false
  const trimmed = value.trim()
  if (!trimmed) return false
  return GITHUB_PR_URL.test(trimmed)
}

/** Case-insensitive match for webhook ↔ stored `pr_url`. */
export function normalizeGithubPrUrlForMatch(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.replace(/\/+$/, '').toLowerCase()
}

const GITHUB_PR_PARTS =
  /^https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)\/?(?:\?.*)?$/i

export type ParsedGithubPullRequestUrl = {
  owner: string
  repo: string
  number: number
  htmlUrl: string
}

export function parseGithubPullRequestUrl(value: string | null | undefined): ParsedGithubPullRequestUrl | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = GITHUB_PR_PARTS.exec(trimmed)
  if (!match) return null
  const owner = match[1]
  const repo = match[2]
  const number = Number(match[3])
  if (!owner || !repo || !Number.isFinite(number) || number <= 0) return null
  return {
    owner,
    repo,
    number,
    htmlUrl: trimmed.replace(/\/+$/, ''),
  }
}
