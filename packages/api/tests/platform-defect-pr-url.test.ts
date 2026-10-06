import { describe, expect, it } from 'vitest'
import {
  isGithubPullRequestUrl,
  normalizeGithubPrUrlForMatch,
  parseGithubPullRequestUrl,
} from '../src/domain/ops/platform-defect-pr-url.js'

describe('platform-defect-pr-url', () => {
  it('validates GitHub PR URLs', () => {
    expect(isGithubPullRequestUrl('https://github.com/RafaDru/aiyra-care/pull/84')).toBe(true)
    expect(isGithubPullRequestUrl('http://github.com/org/repo/pull/1/')).toBe(true)
    expect(isGithubPullRequestUrl('https://gitlab.com/o/r/-/merge_requests/1')).toBe(false)
  })

  it('normalizes for case-insensitive match', () => {
    expect(normalizeGithubPrUrlForMatch('https://github.com/RafaDru/aiyra-care/pull/1/')).toBe(
      'https://github.com/rafadru/aiyra-care/pull/1',
    )
  })

  it('parses owner, repo, and number', () => {
    expect(parseGithubPullRequestUrl('https://github.com/RafaDru/aiyra-care/pull/42')).toEqual({
      owner: 'RafaDru',
      repo: 'aiyra-care',
      number: 42,
      htmlUrl: 'https://github.com/RafaDru/aiyra-care/pull/42',
    })
    expect(parseGithubPullRequestUrl('not-a-url')).toBeNull()
  })
})
