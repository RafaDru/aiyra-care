import { ExamOrder } from '../../domain/exam-order/exam-order.entity.js'
import type { ExamOrderRepository } from '../../domain/exam-order/exam-order.repository.js'
import { buildExamOrderExternalKey } from '../../domain/exam-order/exam-order-keys.js'
import { NotFoundError } from '../../domain/errors.js'
import type { FileStorage } from '../../domain/document/file-storage.js'

export class ExamOrderService {
  constructor(
    private readonly repo: ExamOrderRepository,
    private readonly storage?: FileStorage,
  ) {}

  async findById(id: string) {
    const order = await this.repo.findById(id)
    if (!order) throw new NotFoundError('ExamOrder', id)
    return order
  }

  async findAll(filter?: { patientId?: string }) {
    return this.repo.findAll(filter)
  }

  async upsertFromPortal(args: {
    patientId: string
    source: string
    portalOrderId: string
    orderDate?: Date
    laboratory?: string
    portalOrderLabel?: string
  }) {
    const externalKey = buildExamOrderExternalKey(args.source, args.portalOrderId)
    const notes = args.portalOrderLabel
      ? JSON.stringify({ portalOrderLabel: args.portalOrderLabel })
      : undefined
    const existing = await this.repo.findByPatientAndExternalKey(args.patientId, externalKey)
    if (existing) {
      if (notes && !existing.notes) {
        return this.repo.update(
          ExamOrder.restore({ ...existing.toJSON(), notes }),
        )
      }
      return existing
    }
    return this.repo.save(ExamOrder.create({
      patientId: args.patientId,
      externalKey,
      source: args.source,
      portalOrderId: args.portalOrderId,
      orderDate: args.orderDate,
      laboratory: args.laboratory,
      notes,
    }))
  }

  async attachResultFile(id: string, storagePath: string, documentId?: string) {
    const order = await this.findById(id)
    const updated = order.withAssets({
      resultFileUrl: storagePath,
      documentId: documentId ?? order.documentId,
    })
    return this.repo.update(updated)
  }

  async readResultFile(storagePath: string) {
    if (!this.storage) throw new Error('FileStorage não configurado')
    return this.storage.read(storagePath)
  }
}
