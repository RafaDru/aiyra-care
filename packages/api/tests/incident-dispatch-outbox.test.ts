import { describe, expect, it, vi } from 'vitest'
import type { Pool } from 'pg'
import { IncidentDispatchOutboxPgRepository } from '../src/infrastructure/persistence/incident-dispatch-outbox.pg.repository.js'

describe('IncidentDispatchOutboxPgRepository', () => {
  it('insertIfAbsent respects idempotency', async () => {
    const byKey = new Map<string, Record<string, unknown>>()

    const pool = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes('INSERT INTO incident_dispatch_outbox')) {
          const key = params![1] as string
          if (byKey.has(key)) return { rows: [] }
          const row = {
            id: 'o1',
            incident_id: params![0],
            idempotency_key: key,
            payload: JSON.parse(params![2] as string),
            status: 'pending',
            attempt_count: 0,
            last_error: null,
            forwarded_at: null,
            claimed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          byKey.set(key, row)
          return { rows: [row] }
        }
        if (sql.includes('WHERE idempotency_key = $1')) {
          const row = byKey.get(params![0] as string)
          return { rows: row ? [row] : [] }
        }
        return { rows: [] }
      }),
    } as unknown as Pool

    const repo = new IncidentDispatchOutboxPgRepository(pool)
    const first = await repo.insertIfAbsent({
      incidentId: 'inc-1',
      idempotencyKey: 'inc-1:triage_v1',
      payload: { type: 'triage' },
    })
    expect(first?.idempotencyKey).toBe('inc-1:triage_v1')

    const dup = await repo.insertIfAbsent({
      incidentId: 'inc-1',
      idempotencyKey: 'inc-1:triage_v1',
      payload: { type: 'triage' },
    })
    expect(dup).toBeNull()

    const loaded = await repo.findByIdempotencyKey('inc-1:triage_v1')
    expect(loaded?.status).toBe('pending')
  })
})
