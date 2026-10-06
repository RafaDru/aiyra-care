import { describe, expect, it, vi } from 'vitest'
import { fetchGithubCiWebhookPayloadForPullRequest } from '../src/infrastructure/github/github-defect-ci-poll.client.js'

describe('fetchGithubCiWebhookPayloadForPullRequest', () => {
  it('builds workflow_run payload from GitHub API responses', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/pulls/42')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ sha: 'abc123' }),
        }
      }
      if (url.includes('/actions/runs')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            workflow_runs: [
              {
                status: 'completed',
                conclusion: 'success',
                html_url: 'https://github.com/RafaDru/aiyra-care/actions/runs/9',
                head_branch: 'cursor/fix',
                updated_at: '2026-10-06T12:00:00Z',
              },
            ],
          }),
        }
      }
      throw new Error(`unexpected url ${url}`)
    }) as typeof fetch

    const result = await fetchGithubCiWebhookPayloadForPullRequest(
      {
        owner: 'RafaDru',
        repo: 'aiyra-care',
        number: 42,
        htmlUrl: 'https://github.com/RafaDru/aiyra-care/pull/42',
      },
      { token: 'gh_test', repoFullName: 'RafaDru/aiyra-care', fetchImpl },
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload.workflow_run).toMatchObject({
        status: 'completed',
        conclusion: 'success',
      })
    }
  })

  it('returns no_workflow_runs when actions list empty', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/pulls/1')) {
        return { ok: true, status: 200, json: async () => ({ sha: 'deadbeef' }) }
      }
      return { ok: true, status: 200, json: async () => ({ workflow_runs: [] }) }
    }) as typeof fetch

    const result = await fetchGithubCiWebhookPayloadForPullRequest(
      {
        owner: 'o',
        repo: 'r',
        number: 1,
        htmlUrl: 'https://github.com/o/r/pull/1',
      },
      { token: 't', fetchImpl },
    )
    expect(result).toEqual({ ok: false, reason: 'no_workflow_runs' })
  })
})
