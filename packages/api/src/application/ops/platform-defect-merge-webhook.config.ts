export function resolveGithubDefectMergeWebhookSecret(env: NodeJS.ProcessEnv = process.env): string {
  return env.GITHUB_DEFECT_MERGE_WEBHOOK_SECRET?.trim() ?? ''
}

export function resolveGithubDefectMergeBaseRef(env: NodeJS.ProcessEnv = process.env): string {
  return env.GITHUB_DEFECT_MERGE_BASE_REF?.trim() || 'main'
}
