import { describe, expect, it } from 'vitest'
import { isGithubPullRequestUrl } from '../src/domain/ops/platform-defect-pr-url.js'

describe('isGithubPullRequestUrl', () => {
  it('accepts canonical GitHub PR URLs', () => {
    expect(isGithubPullRequestUrl('https://github.com/RafaDru/aiyra-care/pull/84')).toBe(true)
    expect(isGithubPullRequestUrl('http://github.com/org/repo/pull/1/')).toBe(true)
  })

  it('rejects missing or non-GitHub URLs', () => {
    expect(isGithubPullRequestUrl(null)).toBe(false)
    expect(isGithubPullRequestUrl('')).toBe(false)
    expect(isGithubPullRequestUrl('https://gitlab.com/a/b/-/merge_requests/1')).toBe(false)
    expect(isGithubPullRequestUrl('https://github.com/org/repo/issues/1')).toBe(false)
  })
})
