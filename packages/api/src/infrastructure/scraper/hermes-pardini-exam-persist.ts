import type { Pool } from 'pg'
import type { APIRequestContext } from 'playwright'
import { Exam } from '../../domain/exam/exam.entity.js'
import { Document } from '../../domain/document/document.entity.js'
import { ExamPgRepository } from '../persistence/exam.pg.repository.js'
import { ExamOrderPgRepository } from '../persistence/exam-order.pg.repository.js'
import { DocumentPgRepository } from '../persistence/document.pg.repository.js'
import { GcsFileStorage, isGcsStorageConfigured } from '../storage/gcs.storage.js'
import { ExamOrderService } from '../../application/exam-order/exam-order.service.js'
import { buildExamOrderExternalKey } from '../../domain/exam-order/exam-order-keys.js'
import type { HermesPardiniApiHeaderProfile, HermesPardiniExamItem } from './hermes-pardini-bff.service.js'
import { downloadHermesPardiniPedidoPdf } from './hermes-pardini-bff.service.js'
import { clipExamSummary, extractReportPdfText } from './exam-pdf-text.helper.js'

function parseExamNotes(notes: string | null): { dedup: string; meta: Record<string, unknown> } {
  if (!notes) return { dedup: '', meta: {} }
  const nl = notes.indexOf('\n')
  if (nl < 0) return { dedup: notes, meta: {} }
  try {
    return { dedup: notes.slice(0, nl), meta: JSON.parse(notes.slice(nl + 1)) as Record<string, unknown> }
  } catch {
    return { dedup: notes.slice(0, nl), meta: {} }
  }
}

function buildExamNotes(dedup: string, meta: Record<string, unknown>): string {
  return `${dedup}\n${JSON.stringify(meta)}`
}

export function hermesPardiniExamNotes(dedup: string, meta: Record<string, unknown>): string {
  return buildExamNotes(dedup, meta)
}

export async function persistHermesPardiniLaudos(args: {
  pool: Pool
  request: APIRequestContext
  accessToken: string
  patientId: string
  exams: HermesPardiniExamItem[]
  headerProfile?: HermesPardiniApiHeaderProfile
  onProgress?: (message: string) => void
}): Promise<{ downloaded: number; skipped: number }> {
  const { pool, request, accessToken, patientId, exams, headerProfile, onProgress } = args
  const examRepo = new ExamPgRepository(pool)
  const orderService = new ExamOrderService(new ExamOrderPgRepository(pool))
  const docRepo = new DocumentPgRepository(pool)
  const storage = new GcsFileStorage()

  const pedidoIds = [...new Set(
    exams.map((e) => e.pedidoId).filter((id) => id && id !== 'unknown'),
  )]

  if (!isGcsStorageConfigured()) {
    onProgress?.('GCS não configurado — laudos PDF não serão gravados (defina GCP_SERVICE_ACCOUNT_KEY)')
    return { downloaded: 0, skipped: pedidoIds.length }
  }

  const existingOrders = await orderService.findAll({ patientId })
  const pedidoPdfDone = new Set<string>()
  for (const order of existingOrders) {
    if (order.source !== 'hermes_pardini' || !order.portalOrderId) continue
    if (order.documentId || order.resultFileUrl) pedidoPdfDone.add(order.portalOrderId)
  }

  let downloaded = 0
  let skipped = 0

  for (const pedidoId of pedidoIds) {
    if (pedidoPdfDone.has(pedidoId)) {
      skipped++
      continue
    }

    const externalKey = buildExamOrderExternalKey('hermes_pardini', pedidoId)
    let order = existingOrders.find((o) => o.externalKey === externalKey)
    if (!order) {
      order = await orderService.upsertFromPortal({
        patientId,
        source: 'hermes_pardini',
        portalOrderId: pedidoId,
        portalOrderLabel: exams.find((e) => e.pedidoId === pedidoId)?.pedidoDisplayId,
      })
    }

    onProgress?.(`Laudo pedido ${pedidoId}…`)
    const file = await downloadHermesPardiniPedidoPdf(request, accessToken, pedidoId, headerProfile)
    if (!file) {
      skipped++
      continue
    }

    let extractedText: string | null = null
    try {
      extractedText = await extractReportPdfText(file.buffer, file.mimeType)
    } catch {
      extractedText = null
    }

    const { path, sizeBytes } = await storage.upload(
      patientId,
      file.filename,
      file.buffer,
      file.mimeType,
    )
    const doc = await docRepo.save(Document.create({
      patientId,
      documentType: 'report',
      originalFilename: file.filename,
      storagePath: path,
      fileSizeBytes: sizeBytes,
      mimeType: file.mimeType,
      extractedText: extractedText ?? undefined,
      ocrProcessed: extractedText ? true : undefined,
      ocrProvider: extractedText ? 'cascade:report' : undefined,
    }))

    await orderService.attachResultFile(order.id, path, doc.id)

    const pdfSummary = extractedText ? clipExamSummary(extractedText) : null
    const prefix = `hermes_pardini:${pedidoId}:`
    const freshExams = await examRepo.findAll({ patientId })
    for (const existing of freshExams) {
      const { dedup, meta } = parseExamNotes(existing.notes)
      if (!dedup.startsWith(prefix)) continue
      const mergedSummary = existing.resultSummary ?? pdfSummary ?? null
      const updated = Exam.restore({
        ...existing.toJSON(),
        examOrderId: existing.examOrderId ?? order.id,
        resultSummary: mergedSummary,
        notes: buildExamNotes(dedup, {
          ...meta,
          pedidoId,
          documentId: doc.id,
        }),
      })
      await examRepo.update(updated)
    }

    downloaded++
    pedidoPdfDone.add(pedidoId)
  }

  return { downloaded, skipped }
}
