export type ScheduledEventKind = 'appointment' | 'reminder' | 'task'
export type ScheduledEventStatus = 'planned' | 'done' | 'cancelled'
export type ScheduledEventSource = 'local' | 'ics_import' | 'google' | 'microsoft'

export interface ScheduledEventProps {
  patientId: string
  healthThreadId?: string
  title: string
  description?: string
  scheduledAt: Date
  endAt?: Date
  kind?: ScheduledEventKind
  status?: ScheduledEventStatus
  source?: ScheduledEventSource
  externalUid?: string
  sourceLabel?: string
}

export interface ScheduledEventData {
  id: string
  patientId: string
  healthThreadId: string | null
  title: string
  description: string | null
  scheduledAt: Date
  endAt: Date | null
  kind: ScheduledEventKind
  status: ScheduledEventStatus
  source: ScheduledEventSource
  externalUid: string | null
  sourceLabel: string | null
  createdAt: Date
  updatedAt: Date
}

export class ScheduledEvent {
  private constructor(private readonly data: ScheduledEventData) {}

  static create(props: ScheduledEventProps, id?: string): ScheduledEvent {
    const now = new Date()
    return new ScheduledEvent({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      healthThreadId: props.healthThreadId ?? null,
      title: props.title.trim(),
      description: props.description?.trim() ?? null,
      scheduledAt: props.scheduledAt,
      endAt: props.endAt ?? null,
      kind: props.kind ?? 'reminder',
      status: props.status ?? 'planned',
      source: props.source ?? 'local',
      externalUid: props.externalUid?.trim() ?? null,
      sourceLabel: props.sourceLabel?.trim() ?? null,
      createdAt: now,
      updatedAt: now,
    })
  }

  static restore(data: ScheduledEventData): ScheduledEvent {
    return new ScheduledEvent(data)
  }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get healthThreadId(): string | null { return this.data.healthThreadId }
  get title(): string { return this.data.title }
  get description(): string | null { return this.data.description }
  get scheduledAt(): Date { return this.data.scheduledAt }
  get endAt(): Date | null { return this.data.endAt }
  get kind(): ScheduledEventKind { return this.data.kind }
  get status(): ScheduledEventStatus { return this.data.status }
  get source(): ScheduledEventSource { return this.data.source }
  get externalUid(): string | null { return this.data.externalUid }
  get sourceLabel(): string | null { return this.data.sourceLabel }
  get createdAt(): Date { return this.data.createdAt }
  get updatedAt(): Date { return this.data.updatedAt }

  toJSON(): ScheduledEventData { return { ...this.data } }
}
