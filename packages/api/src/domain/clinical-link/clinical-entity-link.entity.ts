import type { ClinicalEntityType } from './clinical-entity-type.js'

export interface ClinicalEntityLinkData {
  id: string
  patientId: string
  fromEntityType: ClinicalEntityType
  fromEntityId: string
  toEntityType: ClinicalEntityType
  toEntityId: string
  relationCode: string
  label: string | null
  healthThreadId: string | null
  metadata: Record<string, unknown>
  createdBy: string | null
  createdAt: Date
}

export interface CreateClinicalEntityLinkInput {
  patientId: string
  fromEntityType: ClinicalEntityType
  fromEntityId: string
  toEntityType: ClinicalEntityType
  toEntityId: string
  relationCode: string
  label?: string | null
  healthThreadId?: string | null
  metadata?: Record<string, unknown>
  createdBy?: string | null
}

export class ClinicalEntityLink {
  private constructor(private readonly data: ClinicalEntityLinkData) {}

  static create(input: CreateClinicalEntityLinkInput): ClinicalEntityLink {
    return new ClinicalEntityLink({
      id: crypto.randomUUID(),
      patientId: input.patientId,
      fromEntityType: input.fromEntityType,
      fromEntityId: input.fromEntityId,
      toEntityType: input.toEntityType,
      toEntityId: input.toEntityId,
      relationCode: input.relationCode,
      label: input.label ?? null,
      healthThreadId: input.healthThreadId ?? null,
      metadata: input.metadata ?? {},
      createdBy: input.createdBy ?? null,
      createdAt: new Date(),
    })
  }

  static restore(data: ClinicalEntityLinkData): ClinicalEntityLink {
    return new ClinicalEntityLink(data)
  }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get fromEntityType(): ClinicalEntityType { return this.data.fromEntityType }
  get fromEntityId(): string { return this.data.fromEntityId }
  get toEntityType(): ClinicalEntityType { return this.data.toEntityType }
  get toEntityId(): string { return this.data.toEntityId }
  get relationCode(): string { return this.data.relationCode }
  get label(): string | null { return this.data.label }
  get healthThreadId(): string | null { return this.data.healthThreadId }
  get metadata(): Record<string, unknown> { return this.data.metadata }
  get createdBy(): string | null { return this.data.createdBy }
  get createdAt(): Date { return this.data.createdAt }

  toJSON(): ClinicalEntityLinkData {
    return {
      ...this.data,
      createdAt: this.data.createdAt,
    }
  }
}
