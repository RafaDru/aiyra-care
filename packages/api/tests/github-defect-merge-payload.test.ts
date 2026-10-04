import { describe, expect, it } from 'vitest'
import { parseGithubDefectMergeEvent } from '../src/domain/ops/github-defect-merge-payload.js'

const mergedPr = {
  action: 'closed',
  pull_request: {
    merged: true,
    html_url: 'https://github.com/RafaDru/aiyra-care/pull/99',
    body: 'Fixes DEF-000042 for defect 0e672818-0000-4000-8000-000000000001',
    base: { ref: 'main' },
    labels: [{ name: 'DEF-000042' }],
  },
}

describe('parseGithubDefectMergeEvent', () => {
  it('parses merged PR on main', () => {
    const parsed = parseGithubDefectMergeEvent(mergedPr)
    expect(parsed.eligible).toBe(true)
    expect(parsed.mergedPrUrl).toBe('https://github.com/rafadru/aiyra-care/pull/99')
    expect(parsed.referenceCodes).toContain('DEF-000042')
    expect(parsed.defectIds).toContain('0e672818-0000-4000-8000-000000000001')
    expect(parsed.baseRef).toBe('main')
  })

  it('ignores unmerged close', () => {
    const parsed = parseGithubDefectMergeEvent({
      action: 'closed',
      pull_request: { merged: false, html_url: 'https://github.com/o/r/pull/1', base: { ref: 'main' } },
    })
    expect(parsed.eligible).toBe(false)
    expect(parsed.reason).toBe('not_merged')
  })
})
