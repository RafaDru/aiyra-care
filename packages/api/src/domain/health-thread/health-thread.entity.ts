export type HealthThreadKind = 'acompanhamento' | 'investigation' | 'hypothesis' | 'episode'
export type HealthThreadStatus = 'open' | 'active' | 'paused' | 'resolved' | 'ruled_out' | 'converted'
export type HealthThreadPriority = 'low' | 'normal' | 'high'
export type HealthThreadConfidence = 'low' | 'medium' | 'high'

export const ACTIVE_HEALTH_THREAD_STATUSES: HealthThreadStatus[] = ['open', 'active', 'paused']

export interface HealthThreadProps {
  patientId: string
  kind: HealthThreadKind
  title: string
  summary?: string
  status?: HealthThreadStatus
  priority?: HealthThreadPriority
  confidence?: HealthThreadConfidence
  startedAt?: Date
  endedAt?: Date
  dueDate?: Date
  createdBy?: string
  metadata?: Record<string, unknown>
}

export interface HealthThreadData {
  id: string
  patientId: string
  kind: HealthThreadKind
  title: string
  summary: string | null
  status: HealthThreadStatus
  priority: HealthThreadPriority
  confidence: HealthThreadConfidence | null
  startedAt: Date | null
  endedAt: Date | null
  dueDate: Date | null
  createdBy: string | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export class HealthThread {
  private constructor(private readonly data: HealthThreadData) {}

  static create(props: HealthThreadProps, id?: string): HealthThread {
    const now = new Date()
    return new HealthThread({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      kind: props.kind,
      title: props.title.trim(),
      summary: props.summary?.trim() ?? null,
      status: props.status ?? 'open',
      priority: props.priority ?? 'normal',
      confidence: props.confidence ?? null,
      startedAt: props.startedAt ?? now,
      endedAt: props.endedAt ?? null,
      dueDate: props.dueDate ?? null,
      createdBy: props.createdBy ?? null,
      metadata: props.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    })
  }

  static restore(data: HealthThreadData): HealthThread {
    return new HealthThread(data)
  }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get kind(): HealthThreadKind { return this.data.kind }
  get title(): string { return this.data.title }
  get summary(): string | null { return this.data.summary }
  get status(): HealthThreadStatus { return this.data.status }
  get priority(): HealthThreadPriority { return this.data.priority }
  get confidence(): HealthThreadConfidence | null { return this.data.confidence }
  get startedAt(): Date | null { return this.data.startedAt }
  get endedAt(): Date | null { return this.data.endedAt }
  get dueDate(): Date | null { return this.data.dueDate }
  get createdBy(): string | null { return this.data.createdBy }
  get metadata(): Record<string, unknown> { return this.data.metadata }
  get createdAt(): Date { return this.data.createdAt }
  get updatedAt(): Date { return this.data.updatedAt }

  toJSON(): HealthThreadData { return { ...this.data } }
}
