import { describe, expect, it, vi } from 'vitest'
import { HygieneGraphProjector } from '../src/infrastructure/graph/hygiene-graph.projector.js'

function mockDriver() {
  const queries: string[] = []
  const tx = {
    run: vi.fn(async (query: string) => {
      queries.push(query)
      return { records: [] }
    }),
  }
  const driver = {
    session: () => ({
      executeWrite: async (fn: (t: typeof tx) => Promise<void>) => fn(tx),
      close: vi.fn(async () => {}),
    }),
  }
  return { driver: driver as unknown as import('neo4j-driver').Driver, queries, tx }
}

describe('HygieneGraphProjector', () => {
  it('orders entity ids for DUPLICATE_CANDIDATE edge', async () => {
    const { driver, queries } = mockDriver()
    const projector = new HygieneGraphProjector(driver)

    await projector.projectDuplicateCandidate({
      patientId: 'p1',
      entityType: 'exam',
      entityIdA: 'bbb',
      entityIdB: 'aaa',
      candidateId: 'c1',
      score: 0.92,
      detector: 'fingerprint',
    })

    const dupQuery = queries.find((q) => q.includes('DUPLICATE_CANDIDATE'))
    expect(dupQuery).toBeTruthy()
    expect(dupQuery).toContain('Exam')
  })

  it('removes DUPLICATE_CANDIDATE and adds CANONICAL_SAME_AS on same_entity resolve', async () => {
    const { driver, queries } = mockDriver()
    const projector = new HygieneGraphProjector(driver)

    await projector.projectResolve({
      patientId: 'p1',
      entityType: 'vaccine',
      entityIdA: 'v2',
      entityIdB: 'v1',
      candidateId: 'c1',
      decision: 'same_entity',
      canonicalId: 'v1',
      duplicateId: 'v2',
    })

    expect(queries.some((q) => q.includes('DELETE r') && q.includes('DUPLICATE_CANDIDATE'))).toBe(true)
    expect(queries.some((q) => q.includes('CANONICAL_SAME_AS'))).toBe(true)
  })

  it('only deletes DUPLICATE_CANDIDATE on dismiss', async () => {
    const { driver, queries } = mockDriver()
    const projector = new HygieneGraphProjector(driver)

    await projector.projectResolve({
      patientId: 'p1',
      entityType: 'exam',
      entityIdA: 'e1',
      entityIdB: 'e2',
      candidateId: 'c1',
      decision: 'not_duplicate',
    })

    expect(queries.some((q) => q.includes('DUPLICATE_CANDIDATE'))).toBe(true)
    expect(queries.some((q) => q.includes('CANONICAL_SAME_AS'))).toBe(false)
  })
})
