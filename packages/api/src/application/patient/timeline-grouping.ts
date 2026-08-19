import type {
  PatientContextTimelineEvent,
  PatientContextTimelineItem,
  PatientContextTimelineKind,
} from './patient-context.types.js'

function timelineDayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function groupTitle(kind: PatientContextTimelineKind, count: number): string {
  if (count === 1) return ''
  switch (kind) {
    case 'consultation':
      return `${count} consultas`
    case 'extrato':
      return `${count} itens de extrato`
    case 'exam':
      return `${count} exames`
    case 'vaccine':
      return `${count} vacinas`
    case 'authorization':
      return `${count} autorizações`
    case 'medication_start':
      return `${count} medicamentos`
    case 'thread_note':
      return `${count} registros de acompanhamento`
    default:
      return `${count} eventos`
  }
}

function groupSubtitle(kind: PatientContextTimelineKind, list: PatientContextTimelineEvent[]): string | undefined {
  const first = list[0]
  if (kind === 'exam') {
    const labs = [...new Set(list.map((e) => e.subtitle ?? e.source).filter(Boolean))]
    if (labs.length === 1) return labs[0]
    return `${list.length} resultados`
  }
  if (kind === 'vaccine' && list.length > 1) {
    return list.map((e) => e.title).slice(0, 3).join(' · ')
  }
  if (kind === 'authorization' && list.length > 1) {
    return list.map((e) => e.title).slice(0, 2).join(' · ')
  }
  return first.subtitle
}

function toItem(event: PatientContextTimelineEvent): PatientContextTimelineItem {
  return {
    date: event.date,
    title: event.title,
    subtitle: event.subtitle,
    source: event.source,
    entityId: event.entityId,
    examOrderId: event.examOrderId,
  }
}

/**
 * Collapse timeline rows that share the same calendar day and kind into one expandable group.
 * Keeps limit/pagination fair across event types (e.g. hemogram does not hide vaccines).
 */
export function groupTimelineEvents(events: PatientContextTimelineEvent[]): PatientContextTimelineEvent[] {
  const buckets = new Map<string, PatientContextTimelineEvent[]>()

  for (const event of events) {
    const key = `${timelineDayKey(event.date)}|${event.kind}`
    const list = buckets.get(key) ?? []
    list.push(event)
    buckets.set(key, list)
  }

  const grouped: PatientContextTimelineEvent[] = []

  for (const list of buckets.values()) {
    if (list.length === 1) {
      grouped.push(list[0])
      continue
    }

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const kind = list[0].kind
    const latestDate = list.reduce(
      (max, e) => (new Date(e.date).getTime() > new Date(max).getTime() ? e.date : max),
      list[0].date,
    )

    grouped.push({
      date: latestDate,
      kind,
      title: groupTitle(kind, list.length),
      subtitle: groupSubtitle(kind, list),
      source: list[0].source,
      entityId: `${timelineDayKey(list[0].date)}:${kind}`,
      count: list.length,
      items: list.map(toItem),
    })
  }

  grouped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return grouped
}
