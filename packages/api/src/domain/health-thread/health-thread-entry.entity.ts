export type HealthThreadEntryType = 'note' | 'status_change' | 'symptom' | 'system'

export interface HealthThreadEntryProps {
  threadId: string
  entryType?: HealthThreadEntryType
  body: string
  occurredAt?: Date
  createdBy?: string
}

export interface HealthThreadEntryData {
  id: string
  threadId: string
  entryType: HealthThreadEntryType
  body: string
  occurredAt: Date
  createdBy: string | null
  createdAt: Date
}

export class HealthThreadEntry {
  private constructor(private readonly data: HealthThreadEntryData) {}

  static create(props: HealthThreadEntryProps, id?: string): HealthThreadEntry {
    const now = new Date()
    return new HealthThreadEntry({
      id: id ?? crypto.randomUUID(),
      threadId: props.threadId,
      entryType: props.entryType ?? 'note',
      body: props.body.trim(),
      occurredAt: props.occurredAt ?? now,
      createdBy: props.createdBy ?? null,
      createdAt: now,
    })
  }

  static restore(data: HealthThreadEntryData): HealthThreadEntry {
    return new HealthThreadEntry(data)
  }

  get id(): string { return this.data.id }
  get threadId(): string { return this.data.threadId }
  get entryType(): HealthThreadEntryType { return this.data.entryType }
  get body(): string { return this.data.body }
  get occurredAt(): Date { return this.data.occurredAt }
  get createdBy(): string | null { return this.data.createdBy }
  get createdAt(): Date { return this.data.createdAt }

  toJSON(): HealthThreadEntryData { return { ...this.data } }
}
