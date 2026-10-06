export function isDefectCiWebhookEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = env.CH_DEFECT_CI_WEBHOOK_ENABLED?.trim()
  if (flag === '0' || flag === 'false') return false
  return Boolean(resolveGithubDefectCiWebhookSecret(env))
}

export function resolveGithubDefectCiWebhookSecret(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.GITHUB_DEFECT_CI_WEBHOOK_SECRET?.trim()
    || env.GITHUB_DEFECT_CI_TOKEN?.trim()
    || ''
  )
}

export function resolveGithubDefectCiRepoFullName(env: NodeJS.ProcessEnv = process.env): string {
  return env.GITHUB_DEFECT_CI_REPO?.trim() || 'RafaDru/aiyra-care'
}

export function isDefectCiAutoReopenOnFailEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.CH_DEFECT_CI_AUTO_REOPEN_ON_FAIL?.trim()
  return raw === '1' || raw === 'true'
}

export function isChG3RequireReviewApproveEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.CH_G3_REQUIRE_REVIEW_APPROVE?.trim()
  return raw === '1' || raw === 'true'
}
