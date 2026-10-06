import { describe, expect, it } from 'vitest'
import { parseGithubDefectCiEvent } from '../src/domain/ops/github-defect-ci-payload.js'

describe('parseGithubDefectCiEvent', () => {
  it('maps workflow_run success to ci_success', () => {
    const parsed = parseGithubDefectCiEvent({
      action: 'completed',
      repository: { full_name: 'RafaDru/aiyra-care' },
      workflow_run: {
        status: 'completed',
        conclusion: 'success',
        html_url: 'https://github.com/RafaDru/aiyra-care/actions/runs/99',
        pull_requests: [{ html_url: 'https://github.com/RafaDru/aiyra-care/pull/42' }],
      },
    })
    expect(parsed.eligible).toBe(true)
    expect(parsed.pipelineStatus).toBe('ci_success')
    expect(parsed.pullRequestUrls).toEqual([
      'https://github.com/rafadru/aiyra-care/pull/42',
    ])
    expect(parsed.isTerminalSuccess).toBe(true)
  })

  it('maps workflow_run failure to ci_failed', () => {
    const parsed = parseGithubDefectCiEvent({
      repository: { full_name: 'RafaDru/aiyra-care' },
      workflow_run: {
        status: 'completed',
        conclusion: 'failure',
        html_url: 'https://github.com/RafaDru/aiyra-care/actions/runs/100',
        head_branch: 'cursor/fix',
        pull_requests: [{ html_url: 'https://github.com/RafaDru/aiyra-care/pull/42' }],
      },
    })
    expect(parsed.pipelineStatus).toBe('ci_failed')
    expect(parsed.isTerminalFailure).toBe(true)
    expect(parsed.failedJobs).toEqual(['cursor/fix'])
  })

  it('ignores events without pull request', () => {
    const parsed = parseGithubDefectCiEvent({
      workflow_run: { status: 'completed', conclusion: 'success' },
    })
    expect(parsed.eligible).toBe(false)
    expect(parsed.reason).toBe('no_pull_request')
  })
})
