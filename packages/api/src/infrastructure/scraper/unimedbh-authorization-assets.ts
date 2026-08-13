import type { Page } from 'playwright'
import { Document } from '../../domain/document/document.entity.js'
import { DocumentPgRepository } from '../persistence/document.pg.repository.js'
import { GcsFileStorage } from '../storage/gcs.storage.js'
import { pgPool } from '../../db/postgres.js'
import { waitForUnimedScreenService } from './unimedbh-wait-response.helper.js'

const CARENCIA_URL = 'https://app.unimedbh.com.br/PortalDoCliente/DeclaracaoCarencia'

async function blobUrlToBuffer(page: Page, blobUrl: string): Promise<Buffer | null> {
  const base64 = await page.evaluate(async (url) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const reader = new FileReader()
      return await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string
          const comma = result.indexOf(',')
          resolve(comma >= 0 ? result.slice(comma + 1) : result)
        }
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }, blobUrl)
  if (!base64) return null
  return Buffer.from(base64, 'base64')
}

async function captureDoctorPhoto(page: Page): Promise<Buffer | null> {
  const src = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'))
    for (const img of imgs) {
      const s = img.src || ''
      if (s.startsWith('blob:') || s.startsWith('data:image')) return s
    }
    return null
  })
  if (!src) return null
  if (src.startsWith('data:image')) {
    const comma = src.indexOf(',')
    if (comma < 0) return null
    return Buffer.from(src.slice(comma + 1), 'base64')
  }
  return blobUrlToBuffer(page, src)
}

async function capturePdfFromPage(page: Page, trigger: () => Promise<void>): Promise<Buffer | null> {
  const pdfResponse = page.waitForResponse(
    (r) => {
      const ct = r.headers()['content-type'] ?? ''
      return r.ok() && (ct.includes('pdf') || ct.includes('octet-stream'))
    },
    { timeout: 20000 },
  ).catch(() => null)

  const downloadEvent = page.waitForEvent('download', { timeout: 20000 }).catch(() => null)

  await trigger().catch(() => {})

  const download = await downloadEvent
  if (download) {
    const path = await download.path()
    if (path) {
      const { readFileSync } = await import('node:fs')
      return readFileSync(path)
    }
  }

  const res = await pdfResponse
  if (res) {
    return Buffer.from(await res.body())
  }
  return null
}

async function clickBaixarGuia(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: /baixar guia/i })
  if (await btn.count()) {
    await btn.first().click({ timeout: 8000 })
    return
  }
  const link = page.getByText(/baixar guia/i).first()
  if (await link.count()) await link.click({ timeout: 8000 })
}

/** Captura foto do médico e PDF da guia na página de detalhe (upload GCS). */
export async function captureUnimedAuthorizationPageAssets(args: {
  page: Page
  patientId: string
  solicitationNumber: string
}): Promise<{ doctorPhotoUrl?: string; guideDocumentId?: string }> {
  const { page, patientId, solicitationNumber } = args
  if (!solicitationNumber) return {}

  const storage = new GcsFileStorage()
  const docRepo = new DocumentPgRepository(pgPool)

  let doctorPhotoUrl: string | undefined
  let guideDocumentId: string | undefined

  const photoBuf = await captureDoctorPhoto(page)
  if (photoBuf && photoBuf.length > 100) {
    const { path } = await storage.upload(
      patientId,
      `unimed-doctor-${solicitationNumber}.jpg`,
      photoBuf,
      'image/jpeg',
    )
    doctorPhotoUrl = path
  }

  const pdfBuf = await capturePdfFromPage(page, () => clickBaixarGuia(page))
  if (pdfBuf && pdfBuf.length > 200 && pdfBuf[0] === 0x25 && pdfBuf[1] === 0x50) {
    const { path, sizeBytes } = await storage.upload(
      patientId,
      `unimed-guia-${solicitationNumber}.pdf`,
      pdfBuf,
      'application/pdf',
    )
    const doc = await docRepo.save(Document.create({
      patientId,
      documentType: 'report',
      originalFilename: `guia-${solicitationNumber}.pdf`,
      storagePath: path,
      fileSizeBytes: sizeBytes,
      mimeType: 'application/pdf',
    }))
    guideDocumentId = doc.id
  }

  return { doctorPhotoUrl, guideDocumentId }
}

export async function persistUnimedDeclaracaoCarenciaPdf(args: {
  page: Page
  patientId: string
}): Promise<string | null> {
  const { page, patientId } = args
  const docRepo = new DocumentPgRepository(pgPool)
  const storage = new GcsFileStorage()

  const existing = (await docRepo.findAll({ patientId })).find(
    (d) => d.documentType === 'other' && d.originalFilename.includes('carencia'),
  )
  if (existing) return existing.id

  const pdfWait = waitForUnimedScreenService(page, 'DeclaracaoCarencia', 25000).catch(() => null)
  await page.goto(CARENCIA_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })

  let pdfBuf: Buffer | null = null
  const screenRes = await pdfWait
  if (screenRes) {
    const ct = screenRes.headers()['content-type'] ?? ''
    if (ct.includes('pdf')) {
      pdfBuf = Buffer.from(await screenRes.body())
    }
  }
  if (!pdfBuf) {
    pdfBuf = await capturePdfFromPage(page, async () => {
      const btn = page.getByRole('button', { name: /declara|carência|carencia|baixar|pdf/i })
      if (await btn.count()) await btn.first().click({ timeout: 8000 })
    })
  }

  if (!pdfBuf || pdfBuf.length < 200) return null

  const { createHash } = await import('node:crypto')
  const hash = createHash('sha256').update(pdfBuf).digest('hex').slice(0, 12)
  const { path, sizeBytes } = await storage.upload(
    patientId,
    `unimed-declaracao-carencia-${hash}.pdf`,
    pdfBuf,
    'application/pdf',
  )
  const doc = await docRepo.save(Document.create({
    patientId,
    documentType: 'other',
    originalFilename: 'unimed-declaracao-carencia.pdf',
    storagePath: path,
    fileSizeBytes: sizeBytes,
    mimeType: 'application/pdf',
  }))
  return doc.id
}
