export interface ExamOrderProps {
  patientId: string
  externalKey: string
  source: string
  portalOrderId?: string
  orderDate?: Date
  laboratory?: string
  resultFileUrl?: string
  documentId?: string
  notes?: string
}

export interface ExamOrderData {
  id: string
  patientId: string
  externalKey: string
  source: string
  portalOrderId: string | null
  orderDate: Date | null
  laboratory: string | null
  resultFileUrl: string | null
  documentId: string | null
  notes: string | null
  createdAt: Date
}

export class ExamOrder {
  private constructor(private readonly data: ExamOrderData) {}

  static create(props: ExamOrderProps, id?: string): ExamOrder {
    return new ExamOrder({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      externalKey: props.externalKey,
      source: props.source,
      portalOrderId: props.portalOrderId ?? null,
      orderDate: props.orderDate ?? null,
      laboratory: props.laboratory ?? null,
      resultFileUrl: props.resultFileUrl ?? null,
      documentId: props.documentId ?? null,
      notes: props.notes ?? null,
      createdAt: new Date(),
    })
  }

  static restore(data: ExamOrderData): ExamOrder {
    return new ExamOrder(data)
  }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get externalKey(): string { return this.data.externalKey }
  get source(): string { return this.data.source }
  get portalOrderId(): string | null { return this.data.portalOrderId }
  get orderDate(): Date | null { return this.data.orderDate }
  get laboratory(): string | null { return this.data.laboratory }
  get resultFileUrl(): string | null { return this.data.resultFileUrl }
  get documentId(): string | null { return this.data.documentId }
  get notes(): string | null { return this.data.notes }
  get createdAt(): Date { return this.data.createdAt }

  withAssets(patch: { resultFileUrl?: string | null; documentId?: string | null }): ExamOrder {
    return ExamOrder.restore({
      ...this.data,
      resultFileUrl: patch.resultFileUrl !== undefined ? patch.resultFileUrl : this.data.resultFileUrl,
      documentId: patch.documentId !== undefined ? patch.documentId : this.data.documentId,
    })
  }

  toJSON(): ExamOrderData { return { ...this.data } }
}
