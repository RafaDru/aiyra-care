import { afterEach, describe, expect, it } from 'vitest'
import { evaluateG3AgenticApproveEligibility } from '../src/application/ops/ch-g3-agentic-approve.helper.js'
import {
  isChG3AgenticAutoApproveEnabled,
  isChPrReviewRequireCiGreenEnabled,
} from '../src/application/ops/defect-ci-pipeline.config.js'
import type { PlatformDefectRecord } from '../src/domain/ops/platform-defect.types.js'
import { platformDefectPipelineDefaults } from './fixtures/platform-defect-record.defaults.js'

const baseDefect: PlatformDefectRecord = {
  id: 'def-1',
  referenceCode: 'DEF-000001',
  title: 't',
  status: 'ready_for_pr',
  fingerprint: 'fp',
  impact: 1,
  applications: ['web'],
  ownerSubject: null,
  triageSummary: null,
  triageArtifactPath: null,
  branchName: 'cursor/fix',
  prUrl: 'https://github.com/RafaDru/aiyra-care/pull/1',
  mergedPrUrl: null,
  mergedAt: null,
  fixedVia: null,
  prBatchId: null,
  firstSeenAt: '2026-01-01T00:00:00.000Z',
  fixStartedAt: null,
  lastFixDispatchSentAt: null,
  readyForPrAt: '2026-01-02T00:00:00.000Z',
  fixedAt: null,
  lastFailureKind: null,
  lastFailureSummary: null,
  lastCorrectionFailureDetails: null,
  correctionFailedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  operatorPrApprovedAt: null,
  operatorPrApprovedNote: null,
  ...platformDefectPipelineDefaults,
}

describe('defect-ci-pipeline.config G3 agentic flags', () => {
  afterEach(() => {
    delete process.env.CH_G3_AGENTIC_AUTO_APPROVE
    delete process.env.CH_PR_REVIEW_REQUIRE_CI_GREEN
  })

  it('parses CH_G3_AGENTIC_AUTO_APPROVE', () => {
    expect(isChG3AgenticAutoApproveEnabled({})).toBe(false)
    expect(isChG3AgenticAutoApproveEnabled({ CH_G3_AGENTIC_AUTO_APPROVE: '1' })).toBe(true)
    expect(isChPrReviewRequireCiGreenEnabled({ CH_PR_REVIEW_REQUIRE_CI_GREEN: 'true' })).toBe(true)
  })
})

describe('evaluateG3AgenticApproveEligibility', () => {
  afterEach(() => {
    delete process.env.CH_G3_AGENTIC_AUTO_APPROVE
    delete process.env.CH_PR_REVIEW_REQUIRE_CI_GREEN
  })

  it('requires flag', () => {
    const r = evaluateG3AgenticApproveEligibility(baseDefect, {
      reviewStatus: 'completed',
      recommendation: 'approve',
    })
    expect(r).toEqual({ eligible: false, reason: 'flag_disabled' })
  })

  it('approves when flag on and review approve', () => {
    process.env.CH_G3_AGENTIC_AUTO_APPROVE = '1'
    const r = evaluateG3AgenticApproveEligibility(baseDefect, {
      reviewStatus: 'completed',
      recommendation: 'approve',
    })
    expect(r).toEqual({ eligible: true })
  })

  it('skips request_changes', () => {
    process.env.CH_G3_AGENTIC_AUTO_APPROVE = '1'
    const r = evaluateG3AgenticApproveEligibility(baseDefect, {
      reviewStatus: 'completed',
      recommendation: 'request_changes',
    })
    expect(r).toEqual({ eligible: false, reason: 'recommendation_not_approve' })
  })

  it('requires CI when CH_PR_REVIEW_REQUIRE_CI_GREEN=1', () => {
    process.env.CH_G3_AGENTIC_AUTO_APPROVE = '1'
    process.env.CH_PR_REVIEW_REQUIRE_CI_GREEN = '1'
    const r = evaluateG3AgenticApproveEligibility(baseDefect, {
      reviewStatus: 'completed',
      recommendation: 'approve',
    })
    expect(r).toEqual({ eligible: false, reason: 'ci_not_green' })
  })

  it('accepts ciSnapshot success when pipeline not yet updated', () => {
    process.env.CH_G3_AGENTIC_AUTO_APPROVE = '1'
    process.env.CH_PR_REVIEW_REQUIRE_CI_GREEN = '1'
    const r = evaluateG3AgenticApproveEligibility(baseDefect, {
      reviewStatus: 'completed',
      recommendation: 'approve',
      ciSnapshot: { status: 'success', runUrl: 'https://github.com/actions/runs/1' },
    })
    expect(r).toEqual({ eligible: true })
  })
})
