import { describe, expect, it, vi } from 'vitest'
import type { Pool } from 'pg'
import { PlatformDefectPgRepository } from '../src/infrastructure/persistence/platform-defect.pg.repository.js'

describe('PlatformDefectPgRepository', () => {
  it('inserts and finds by fingerprint', async () => {
    const defects = new Map<string, Record<string, unknown>>()
    let idSeq = 0

    const pool = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes('INSERT INTO platform_defects')) {
          idSeq += 1
          const id = `d${idSeq}`
          const row = {
            id,
            title: params![0],
            status: 'open',
            fingerprint: params![1],
            impact: params![2],
            applications: JSON.parse(params![3] as string),
            owner_subject: params![4],
            triage_summary: params![5],
            triage_artifact_path: params![6],
            pr_batch_id: null,
            first_seen_at: new Date().toISOString(),
            fix_started_at: null,
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

    const found = await repo.findOpenByFingerprint('wallet-sync-500')
    expect(found?.id).toBe(created.id)

    await repo.linkIncident(created.id, 'inc-1', 'agent_triage')
    expect(pool.query).toHaveBeenCalled()
  })
})
