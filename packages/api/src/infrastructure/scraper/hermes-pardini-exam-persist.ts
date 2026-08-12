import type { Pool } from 'pg'
import type { APIRequestContext } from 'playwright'
import { Exam } from '../../domain/exam/exam.entity.js'
import { Document } from '../../domain/document/document.entity.js'
import { ExamPgRepository } from '../persistence/exam.pg.repository.js'
import { DocumentPgRepository } from '../persistence/document.pg.repository.js'
import { GcsFileStorage } from '../storage/gcs.storage.js'
import type { HermesPardiniExamItem } from './hermes-pardini-bff.service.js'
import { downloadHermesPardiniPedidoPdf } from './hermes-pardini-bff.service.js'

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

function pedidoIdFromMeta(meta: Record<string, unknown>): string | null {
  if (typeof meta.pedidoId === 'string' && meta.pedidoId) return meta.pedidoId
  if (typeof meta.pedidoId === 'number') return String(meta.pedidoId)
  return null
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
  onProgress?: (message: string) => void
}): Promise<{ downloaded: number; skipped: number }> {
  const { pool, request, accessToken, patientId, exams, onProgress } = args
  const examRepo = new ExamPgRepository(pool)
  const docRepo = new DocumentPgRepository(pool)
  const storage = new GcsFileStorage()

  const patientExams = await examRepo.findAll({ patientId })
  const pedidoPdfDone = new Set<string>()
  for (const row of patientExams) {
    const { dedup, meta } = parseExamNotes(row.notes)
    const pedidoId = pedidoIdFromMeta(meta)
    if (pedidoId && (typeof meta.documentId === 'string' || row.resultFileUrl)) {
      pedidoPdfDone.add(pedidoId)
    }
    if (dedup.startsWith('hermes_pardini_pedido:') && typeof meta.documentId === 'string') {
      pedidoPdfDone.add(dedup.slice('hermes_pardini_pedido:'.length))
    }
  }

  const pedidoIds = [...new Set(
    exams.map((e) => e.pedidoId).filter((id) => id && id !== 'unknown'),
  )]

  let downloaded = 0
  let skipped = 0

  for (const pedidoId of pedidoIds) {
    if (pedidoPdfDone.has(pedidoId)) {
      skipped++
      continue
    }

    onProgress?.(`Laudo pedido ${pedidoId}…`)
    const file = await downloadHermesPardiniPedidoPdf(request, accessToken, pedidoId)
    if (!file) {
      skipped++
      continue
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
    }))

    const prefix = `hermes_pardini:${pedidoId}:`
    const freshExams = await examRepo.findAll({ patientId })
    for (const existing of freshExams) {
      const { dedup, meta } = parseExamNotes(existing.notes)
      if (!dedup.startsWith(prefix)) continue
      const updated = Exam.restore({
        ...existing.toJSON(),
        resultFileUrl: path,
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
