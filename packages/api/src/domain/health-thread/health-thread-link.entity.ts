export type HealthThreadLinkEntityType =
  | 'exam'
  | 'medical_record'
  | 'authorization'
  | 'diagnosis'
  | 'document'
  | 'appointment'
  | 'allergy'
  | 'medication'
  | 'vaccine'

export type HealthThreadLinkRole = 'ordered' | 'scheduled' | 'result' | 'related' | 'blocked_by'

export interface HealthThreadLinkProps {
  threadId: string
  entityType: HealthThreadLinkEntityType
  entityId: string
  role?: HealthThreadLinkRole
  label?: string
}

export interface HealthThreadLinkData {
  id: string
  threadId: string
  entityType: HealthThreadLinkEntityType
  entityId: string
  role: HealthThreadLinkRole
  label: string | null
  createdAt: Date
}

export class HealthThreadLink {
  private constructor(private readonly data: HealthThreadLinkData) {}

  static create(props: HealthThreadLinkProps, id?: string): HealthThreadLink {
    return new HealthThreadLink({
      id: id ?? crypto.randomUUID(),
      threadId: props.threadId,
      entityType: props.entityType,
      entityId: props.entityId,
      role: props.role ?? 'related',
      label: props.label?.trim() ?? null,
      createdAt: new Date(),
    })
  }

  static restore(data: HealthThreadLinkData): HealthThreadLink {
    return new HealthThreadLink(data)
  }

  get id(): string { return this.data.id }
  get threadId(): string { return this.data.threadId }
  get entityType(): HealthThreadLinkEntityType { return this.data.entityType }
  get entityId(): string { return this.data.entityId }
  get role(): HealthThreadLinkRole { return this.data.role }
  get label(): string | null { return this.data.label }
  get createdAt(): Date { return this.data.createdAt }

  toJSON(): HealthThreadLinkData { return { ...this.data } }
}
