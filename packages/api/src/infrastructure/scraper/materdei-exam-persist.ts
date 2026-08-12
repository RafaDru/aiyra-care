import type { Pool } from 'pg'
import type { APIRequestContext } from 'playwright'
import { Exam } from '../../domain/exam/exam.entity.js'
import { Document } from '../../domain/document/document.entity.js'
import { ExamPgRepository } from '../persistence/exam.pg.repository.js'
import { DocumentPgRepository } from '../persistence/document.pg.repository.js'
import { GcsFileStorage } from '../storage/gcs.storage.js'
import type { MaterDeiExamItem } from './materdei-exam.mapper.js'
import { materDeiExamDedupKey } from './materdei-exam.mapper.js'
import { downloadMaterDeiExamFile } from './materdei-exam-files.js'
import { scrapeMaterDeiVueMotionForExam } from './materdei-vuemotion.scraper.js'

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

export async function persistMaterDeiExamFiles(args: {
  pool: Pool
  request: APIRequestContext
  accessToken: string
  gatewayPatientId: number
  exams: MaterDeiExamItem[]
  resolvePatientId: (exam: MaterDeiExamItem) => string
  onProgress?: (message: string) => void
}): Promise<{ downloaded: number; skipped: number }> {
  const { pool, request, accessToken, gatewayPatientId, exams, resolvePatientId, onProgress } = args
  const examRepo = new ExamPgRepository(pool)
  const docRepo = new DocumentPgRepository(pool)
  const storage = new GcsFileStorage()

  const allExams = await examRepo.findAll()
  const byDedup = new Map<string, Exam>()
  for (const row of allExams) {
    const { dedup, meta } = parseExamNotes(row.notes)
    if (dedup.startsWith('mater_dei:')) {
      byDedup.set(`${row.patientId}:${dedup}`, row)
    }
    if (typeof meta.documentId === 'string') {
      byDedup.set(`${row.patientId}:${dedup}`, row)
    }
  }

  let downloaded = 0
  let skipped = 0
  for (const item of exams) {
    if (!item.reportAvailable && !item.imageAvailable) continue

    const targetPatientId = resolvePatientId(item)
    const dedup = materDeiExamDedupKey(item)
    const existing = byDedup.get(`${targetPatientId}:${dedup}`)
    const existingMeta = parseExamNotes(existing?.notes ?? null)
    const seriesDone = typeof existingMeta.meta.imageSeriesCount === 'number'
      && (existingMeta.meta.imageSeriesCount as number) > 0
    const reportDone = typeof existingMeta.meta.documentId === 'string'
    const needsReport = (item.reportAvailable || item.imageAvailable) && !reportDone
    const needsImages = item.imageAvailable
      && !seriesDone
      && (item.itemType === 'IMAGE' || item.orderType === 'IMAGE')
    if (!needsReport && !needsImages) {
      skipped++
      continue
    }

    onProgress?.(`Baixando ${item.examType.slice(0, 40)}...`)
    let reportPath: string | null = existing?.resultFileUrl ?? null
    let reportDocId: string | null = typeof existingMeta.meta.documentId === 'string'
      ? existingMeta.meta.documentId
      : null

    if (!reportDocId && (item.reportAvailable || item.imageAvailable)) {
      const file = await downloadMaterDeiExamFile(request, accessToken, gatewayPatientId, item)
      if (file) {
        const { path, sizeBytes } = await storage.upload(targetPatientId, file.filename, file.buffer, file.mimeType)
        const doc = await docRepo.save(Document.create({
          patientId: targetPatientId,
          documentType: item.imageAvailable && !item.reportAvailable ? 'exam' : 'report',
          originalFilename: file.filename,
          storagePath: path,
          fileSizeBytes: sizeBytes,
          mimeType: file.mimeType,
        }))
        reportPath = path
        reportDocId = doc.id
      }
    }

    let imageDocumentIds: string[] = Array.isArray(existingMeta.meta.imageDocumentIds)
      ? existingMeta.meta.imageDocumentIds as string[]
      : []
    let imageSeriesCount = typeof existingMeta.meta.imageSeriesCount === 'number'
      ? existingMeta.meta.imageSeriesCount as number
      : 0
    let viewerUrl = typeof existingMeta.meta.viewerUrl === 'string' ? existingMeta.meta.viewerUrl : undefined

    if (
      item.imageAvailable
      && item.examOrderItemId != null
      && !seriesDone
      && (item.itemType === 'IMAGE' || item.orderType === 'IMAGE')
    ) {
      onProgress?.(`VueMotion: ${item.examType.slice(0, 35)}...`)
      const series = await scrapeMaterDeiVueMotionForExam(
        request,
        accessToken,
        item.examOrderItemId,
        { maxScrollSteps: 220 },
      )
      if (series.viewerUrl) viewerUrl = series.viewerUrl

      const slug = item.examType.replace(/[^\w.-]+/g, '_').slice(0, 30)
      for (let i = 0; i < series.images.length; i++) {
        const img = series.images[i]
        const { path, sizeBytes } = await storage.upload(
          targetPatientId,
          `materdei-${slug}-${img.filename}`,
          img.buffer,
          img.mimeType,
        )
        const doc = await docRepo.save(Document.create({
          patientId: targetPatientId,
          documentType: 'exam',
          originalFilename: img.filename,
          storagePath: path,
          fileSizeBytes: sizeBytes,
          mimeType: img.mimeType,
        }))
        imageDocumentIds.push(doc.id)
      }
      imageSeriesCount = series.images.length
      if (series.images.length > 0) downloaded += series.images.length
      else if (reportDocId) downloaded++
    } else if (reportDocId && !seriesDone) {
      downloaded++
    } else {
      skipped++
      continue
    }

    const meta = {
      examOrderId: item.examOrderId,
      examOrderItemId: item.examOrderItemId,
      accessionNumber: item.accessionNumber,
      hospitalId: item.hospitalId,
      attendanceId: item.attendanceId,
      orderType: item.orderType,
      imageAvailable: item.imageAvailable,
      reportAvailable: item.reportAvailable,
      documentId: reportDocId,
      viewerUrl,
      imageDocumentIds,
      imageSeriesCount,
    }

    const resultPath = reportPath ?? (imageDocumentIds.length > 0
      ? (await docRepo.findById(imageDocumentIds[0]))?.storagePath ?? null
      : null)

    if (existing) {
      const updated = Exam.restore({
        ...existing.toJSON(),
        resultFileUrl: resultPath,
        notes: buildExamNotes(dedup, meta),
      })
      await examRepo.update(updated)
    } else {
      const parsedDate = new Date(item.examDate)
      if (isNaN(parsedDate.getTime())) continue
      const created = await examRepo.save(Exam.create({
        patientId: targetPatientId,
        examType: item.examType,
        examDate: parsedDate,
        laboratory: item.provider || 'Mater Dei',
        resultSummary: item.status || undefined,
        resultFileUrl: resultPath ?? undefined,
        source: 'mater_dei',
        notes: buildExamNotes(dedup, meta),
      }))
      byDedup.set(`${targetPatientId}:${dedup}`, created)
    }
  }

  return { downloaded, skipped }
}

export function buildMaterDeiExamMeta(exam: MaterDeiExamItem): Record<string, unknown> {
  return {
    examOrderId: exam.examOrderId,
    examOrderItemId: exam.examOrderItemId,
    accessionNumber: exam.accessionNumber,
    hospitalId: exam.hospitalId,
    attendanceId: exam.attendanceId,
    orderType: exam.orderType,
    imageAvailable: exam.imageAvailable,
    reportAvailable: exam.reportAvailable,
  }
}

export function parseMaterDeiExamNotes(notes: string | null): { dedup: string; meta: Record<string, unknown> } {
  return parseExamNotes(notes)
}

export function materDeiExamNotes(dedup: string, meta: Record<string, unknown>): string {
  return buildExamNotes(dedup, meta)
}
