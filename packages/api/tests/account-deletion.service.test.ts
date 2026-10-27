import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AccountDeletionService } from '../src/application/account/account-deletion.service.js'

describe('AccountDeletionService', () => {
  const queries: string[] = []
  const client = {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      queries.push(String(sql))
      if (sql.includes('SELECT id FROM patients')) {
        return { rows: [] }
      }
      if (sql.includes('DELETE FROM patient_memberships')) {
        return { rowCount: 0 }
      }
      if (sql.includes('DELETE FROM care_circles')) {
        return { rowCount: 1 }
      }
      if (sql.includes('DELETE FROM app_accounts')) {
        return { rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    }),
    release: vi.fn(),
  }
  const pool = {
    connect: vi.fn(async () => client),
    query: vi.fn(async () => ({ rows: [] })),
  }

  beforeEach(() => {
    queries.length = 0
    vi.clearAllMocks()
  })

  it('deletes care_circles owned by account before app_accounts (FK RESTRICT)', async () => {
    const service = new AccountDeletionService(pool as never, { delete: vi.fn() }, null)
    await service.deleteAccount('acc-1', 'sub-1')

    const circleDelete = queries.find((q) => q.includes('care_circles'))
    const accountDelete = queries.find((q) => q.includes('app_accounts'))
    expect(circleDelete).toBeTruthy()
    expect(accountDelete).toBeTruthy()
    expect(queries.indexOf(circleDelete!)).toBeLessThan(queries.indexOf(accountDelete!))
  })
})
