export interface AllergyProps {
  patientId: string
  allergen: string
  reaction?: string
  severity?: string
  diagnosedDate?: Date
  notes?: string
}

export interface AllergyData {
  id: string
  patientId: string
  allergen: string
  reaction: string | null
  severity: string | null
  diagnosedDate: Date | null
  notes: string | null
  createdAt: Date
}

export class Allergy {
  private constructor(private readonly data: AllergyData) {}

  static create(props: AllergyProps, id?: string): Allergy {
    return new Allergy({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      allergen: props.allergen,
      reaction: props.reaction ?? null,
      severity: props.severity ?? null,
      diagnosedDate: props.diagnosedDate ?? null,
      notes: props.notes ?? null,
      createdAt: new Date(),
    })
  }

  static restore(data: AllergyData): Allergy { return new Allergy(data) }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get allergen(): string { return this.data.allergen }
  get reaction(): string | null { return this.data.reaction }
  get severity(): string | null { return this.data.severity }
  get diagnosedDate(): Date | null { return this.data.diagnosedDate }
  get notes(): string | null { return this.data.notes }
  get createdAt(): Date { return this.data.createdAt }

  toJSON(): AllergyData { return { ...this.data } }
}
