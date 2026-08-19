export interface ExamProps {
  patientId: string
  medicalRecordId?: string
  examOrderId?: string
  examType: string
  examDate: Date
  resultSummary?: string
  resultFileUrl?: string
  laboratory?: string
  notes?: string
  source?: string
}

export interface ExamData {
  id: string
  patientId: string
  medicalRecordId: string | null
  examOrderId: string | null
  examType: string
  examDate: Date
  resultSummary: string | null
  resultFileUrl: string | null
  laboratory: string | null
  notes: string | null
  source: string
  createdAt: Date
}

export class Exam {
  private constructor(private readonly data: ExamData) {}

  static create(props: ExamProps, id?: string): Exam {
    return new Exam({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      medicalRecordId: props.medicalRecordId ?? null,
      examOrderId: props.examOrderId ?? null,
      examType: props.examType,
      examDate: props.examDate,
      resultSummary: props.resultSummary ?? null,
      resultFileUrl: props.resultFileUrl ?? null,
      laboratory: props.laboratory ?? null,
      notes: props.notes ?? null,
      source: props.source ?? 'manual',
      createdAt: new Date(),
    })
  }

  static restore(data: ExamData): Exam { return new Exam(data) }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get medicalRecordId(): string | null { return this.data.medicalRecordId }
  get examOrderId(): string | null { return this.data.examOrderId }
  get examType(): string { return this.data.examType }
  get examDate(): Date { return this.data.examDate }
  get resultSummary(): string | null { return this.data.resultSummary }
  get resultFileUrl(): string | null { return this.data.resultFileUrl }
  get laboratory(): string | null { return this.data.laboratory }
  get notes(): string | null { return this.data.notes }
  get source(): string { return this.data.source }
  get createdAt(): Date { return this.data.createdAt }

  toJSON(): ExamData { return { ...this.data } }
}
