import { describe, expect, it, vi } from 'vitest'
import type { Pool } from 'pg'
import { PlatformDefectPgRepository } from '../src/infrastructure/persistence/platform-defect.pg.repository.js'

describe('PlatformDefectPgRepository', () => {
  it('inserts and finds by fingerprint', async () => {
    const defects = new Map<string, Record<string, unknown>>()
    let idSeq = 0

    const pool = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes('ops_reference_sequences')) {
          return { rows: [{ next_val: '7' }] }
        }
        if (sql.includes('INSERT INTO platform_defects')) {
          idSeq += 1
          const id = `d${idSeq}`
          const row = {
            id,
            reference_code: params![0],
            title: params![1],
            status: 'open',
            fingerprint: params![2],
            impact: params![3],
            applications: JSON.parse(params![4] as string),
            owner_subject: params![5],
            triage_summary: params![6],
            triage_artifact_path: params![7],
            parent_defect_id: params![8] ?? null,
            pr_batch_id: null,
            first_seen_at: new Date().toISOString(),
            fix_started_at: null,
            last_fix_dispatch_sent_at: null,
            ready_for_pr_at: null,
            fixed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          defects.set(id, row)
          if (row.fingerprint) defects.set(`fp:${row.fingerprint}`, row)
          return { rows: [row] }
        }
        if (sql.includes('WHERE fingerprint = $1')) {
          const row = defects.get(`fp:${params![0]}`)
          return { rows: row ? [row] : [] }
        }
        if (sql.includes('INSERT INTO platform_defect_incidents')) {
          return { rows: [] }
        }
        return { rows: [] }
      }),
    } as unknown as Pool

    const repo = new PlatformDefectPgRepository(pool)
    const created = await repo.insert({
      title: 'Erro carteira',
      fingerprint: 'wallet-sync-500',
    })
    expect(created.title).toBe('Erro carteira')
    expect(created.referenceCode).toBe('DEF-000007')

    const found = await repo.findOpenByFingerprint('wallet-sync-500')
    expect(found?.id).toBe(created.id)

    await repo.linkIncident(created.id, 'inc-1', 'agent_triage')
    expect(pool.query).toHaveBeenCalled()
  })

  it('maps pipeline CI columns from SELECT rows', async () => {
    const pool = {
      query: vi.fn(async (sql: string) => {
        if (!sql.includes('FROM platform_defects')) {
          return { rows: [] }
        }
        return {
          rows: [
            {
              id: 'd-pipe',
              reference_code: 'DEF-000086',
              title: 'CI pipeline',
              status: 'ready_for_pr',
              fingerprint: 'fp-ci',
              impact: 2,
              applications: '[]',
              owner_subject: null,
              triage_summary: null,
              triage_artifact_path: null,
              branch_name: 'cursor/ci',
              pr_url: 'https://github.com/RafaDru/aiyra-care/pull/1',
              merged_pr_url: null,
              merged_at: null,
              fixed_via: null,
              pr_batch_id: null,
              first_seen_at: new Date().toISOString(),
              fix_started_at: null,
              last_fix_dispatch_sent_at: null,
              ready_for_pr_at: new Date().toISOString(),
              fixed_at: null,
              last_failure_kind: 'ci',
              last_failure_summary: 'job api failed',
              last_correction_failure_details: null,
              correction_failed_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              pipeline_status: 'ci_failed',
              last_failure_details: { failedJobs: ['api'] },
              last_ci_run_url: 'https://github.com/RafaDru/aiyra-care/actions/runs/1',
              last_ci_snapshot: { conclusion: 'failure' },
              last_ci_checked_at: new Date().toISOString(),
            },
          ],
        }
      }),
    } as unknown as Pool

    const repo = new PlatformDefectPgRepository(pool)
    const found = await repo.findById('d-pipe')
    expect(found?.pipelineStatus).toBe('ci_failed')
    expect(found?.lastCiRunUrl).toContain('actions/runs/1')
    expect(found?.lastCiSnapshot).toEqual({ conclusion: 'failure' })
    expect(found?.lastFailureDetails).toEqual({ failedJobs: ['api'] })
    expect(found?.lastCiCheckedAt).toBeTruthy()
  })
})
