export type ExamMarkerStatus = 'normal' | 'altered' | 'critical'

export interface ExamResultItemProps {
  examId: string
  patientId: string
  markerName: string
  technicalName?: string
  numericValue?: number
  displayValue: string
  unit?: string
  referenceRange?: string
  status?: ExamMarkerStatus
  collectedAt: Date
  /** Lastro: documento de origem (PDF/laudo) que forneceu este valor. */
  sourceDocumentId?: string | null
}

export interface ExamResultItemData {
  id: string
  examId: string
  patientId: string
  markerName: string
  technicalName: string | null
  numericValue: number | null
  displayValue: string
  unit: string | null
  referenceRange: string | null
  status: ExamMarkerStatus
  collectedAt: Date
  sourceDocumentId: string | null
  createdAt: Date
}

export class ExamResultItem {
  private constructor(private readonly data: ExamResultItemData) {}

  static create(props: ExamResultItemProps, id?: string): ExamResultItem {
    return new ExamResultItem({
      id: id ?? crypto.randomUUID(),
      examId: props.examId,
      patientId: props.patientId,
      markerName: props.markerName,
      technicalName: props.technicalName ?? null,
      numericValue: props.numericValue ?? null,
      displayValue: props.displayValue,
      unit: props.unit ?? null,
      referenceRange: props.referenceRange ?? null,
      status: props.status ?? 'normal',
      collectedAt: props.collectedAt,
      sourceDocumentId: props.sourceDocumentId ?? null,
      createdAt: new Date(),
    })
  }

  static restore(data: ExamResultItemData): ExamResultItem {
    return new ExamResultItem(data)
  }

  get id(): string { return this.data.id }
  get examId(): string { return this.data.examId }
  get patientId(): string { return this.data.patientId }
  get markerName(): string { return this.data.markerName }
  get technicalName(): string | null { return this.data.technicalName }
  get numericValue(): number | null { return this.data.numericValue }
  get displayValue(): string { return this.data.displayValue }
  get unit(): string | null { return this.data.unit }
  get referenceRange(): string | null { return this.data.referenceRange }
  get status(): ExamMarkerStatus { return this.data.status }
  get collectedAt(): Date { return this.data.collectedAt }
  get sourceDocumentId(): string | null { return this.data.sourceDocumentId }
  get createdAt(): Date { return this.data.createdAt }

  toJSON(): ExamResultItemData {
    return { ...this.data }
  }
}
