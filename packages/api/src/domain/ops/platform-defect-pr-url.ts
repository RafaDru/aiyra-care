/** GitHub pull request URL required before `ready_for_pr`. */
const GITHUB_PR_URL =
  /^https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/\d+\/?(?:\?.*)?$/i

export function isGithubPullRequestUrl(value: string | null | undefined): boolean {
  if (value == null) return false
  const trimmed = value.trim()
  if (!trimmed) return false
  return GITHUB_PR_URL.test(trimmed)
}
