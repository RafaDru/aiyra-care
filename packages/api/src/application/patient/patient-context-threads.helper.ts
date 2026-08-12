import type { HealthThread } from '../../domain/health-thread/health-thread.entity.js'
import type { PatientContextActiveThread, PatientContextPendency } from './patient-context.types.js'

const WORKFLOW_THREAD_KINDS = new Set<string>(['task', 'investigation'])

export function buildThreadLinkCountMap(
  threadIds: string[],
  rows: Array<{ thread_id: string; count: number }>,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const id of threadIds) map.set(id, 0)
  for (const row of rows) map.set(row.thread_id, row.count)
  return map
}

export function mapActiveThreadsForContext(
  threads: HealthThread[],
  linkCounts: Map<string, number>,
): PatientContextActiveThread[] {
  return threads.map((t) => ({
    id: t.id,
    kind: t.kind,
    title: t.title,
    status: t.status,
    summary: t.summary,
    updatedAt: t.updatedAt.toISOString(),
    dueDate: t.dueDate?.toISOString() ?? null,
    priority: t.priority,
    linkCount: linkCounts.get(t.id) ?? 0,
  }))
}

export function deriveThreadPendencies(
  threads: HealthThread[],
  linkCounts: Map<string, number>,
  now = Date.now(),
): PatientContextPendency[] {
  const pendencies: PatientContextPendency[] = []

  for (const thread of threads) {
    if (!WORKFLOW_THREAD_KINDS.has(thread.kind)) continue

    if (thread.dueDate && thread.dueDate.getTime() < now) {
      pendencies.push({
        kind: 'health_thread_due',
        threadId: thread.id,
        title: thread.title,
        detail: `Prazo em ${thread.dueDate.toLocaleDateString('pt-BR')}`,
      })
    }

    const links = linkCounts.get(thread.id) ?? 0
    if (links === 0) {
      pendencies.push({
        kind: 'health_thread_unlinked',
        threadId: thread.id,
        title: thread.title,
        detail: 'Sem consultas, exames ou autorizações vinculados',
      })
    }
  }

  return pendencies
}
