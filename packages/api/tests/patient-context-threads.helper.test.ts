import { describe, expect, it } from 'vitest'
import { HealthThread } from '../src/domain/health-thread/health-thread.entity.js'
import {
  buildThreadLinkCountMap,
  deriveThreadPendencies,
  mapActiveThreadsForContext,
} from '../src/application/patient/patient-context-threads.helper.js'

function thread(
  id: string,
  kind: 'task' | 'investigation' | 'hypothesis',
  title: string,
  dueDate?: Date,
) {
  return HealthThread.create({
    patientId: 'p1',
    kind,
    title,
    dueDate,
  }, id)
}

describe('patient-context-threads.helper', () => {
  it('buildThreadLinkCountMap defaults missing ids to zero', () => {
    const map = buildThreadLinkCountMap(['a', 'b'], [{ thread_id: 'a', count: 2 }])
    expect(map.get('a')).toBe(2)
    expect(map.get('b')).toBe(0)
  })

  it('deriveThreadPendencies flags overdue and unlinked workflow threads', () => {
    const overdue = thread('t1', 'task', 'Agendar neurologista', new Date('2026-01-01'))
    const unlinked = thread('t2', 'investigation', 'Febre persistente')
    const counts = buildThreadLinkCountMap(['t1', 't2'], [{ thread_id: 't1', count: 1 }])
    const now = new Date('2026-08-12').getTime()

    const pendencies = deriveThreadPendencies([overdue, unlinked], counts, now)
    expect(pendencies).toHaveLength(2)
    expect(pendencies.find((p) => p.kind === 'health_thread_due')?.threadId).toBe('t1')
    expect(pendencies.find((p) => p.kind === 'health_thread_unlinked')?.threadId).toBe('t2')
  })

  it('mapActiveThreadsForContext includes dueDate, priority and linkCount', () => {
    const t = thread('t1', 'task', 'Retorno pediatra', new Date('2026-09-01'))
    const counts = buildThreadLinkCountMap(['t1'], [{ thread_id: 't1', count: 3 }])
    const mapped = mapActiveThreadsForContext([t], counts)
    expect(mapped[0]).toMatchObject({
      id: 't1',
      title: 'Retorno pediatra',
      linkCount: 3,
      priority: 'normal',
    })
    expect(mapped[0].dueDate).toBeTruthy()
  })
})
