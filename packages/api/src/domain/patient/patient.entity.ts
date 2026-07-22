export interface PatientProps {
  name: string
  birthDate: Date
  gender?: 'male' | 'female'
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  weightKg?: number
  heightCm?: number
  photoUrl?: string
}

export interface PatientData {
  id: string
  name: string
  birthDate: Date
  gender: string | null
  bloodType: string | null
  weightKg: number | null
  heightCm: number | null
  photoUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export class Patient {
  private constructor(private readonly data: PatientData) {}

  static create(props: PatientProps, id?: string): Patient {
    return new Patient({
      id: id ?? crypto.randomUUID(),
      name: props.name,
      birthDate: props.birthDate,
      gender: props.gender ?? null,
      bloodType: props.bloodType ?? null,
      weightKg: props.weightKg ?? null,
      heightCm: props.heightCm ?? null,
      photoUrl: props.photoUrl ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static restore(data: PatientData): Patient {
    return new Patient(data)
  }

  get id(): string { return this.data.id }
  get name(): string { return this.data.name }
  get birthDate(): Date { return this.data.birthDate }
  get gender(): string | null { return this.data.gender }
  get bloodType(): string | null { return this.data.bloodType }
  get weightKg(): number | null { return this.data.weightKg }
  get heightCm(): number | null { return this.data.heightCm }
  get photoUrl(): string | null { return this.data.photoUrl }
  get createdAt(): Date { return this.data.createdAt }
  get updatedAt(): Date { return this.data.updatedAt }

  toJSON(): PatientData {
    return { ...this.data }
  }
}
