import { Document, type DocumentProps, type DocumentType } from '../../domain/document/document.entity.js'
import type { DocumentRepository, DocumentFilter } from '../../domain/document/document.repository.js'
import type { FileStorage } from '../../domain/document/file-storage.js'
import type { DocumentOcrRunner } from '../../domain/document/ocr-provider.js'
import { NotFoundError } from '../../domain/errors.js'
import {
  isIdentityDocumentType,
  parseIdentityDocument,
  type SuggestedPatientFields,
} from '../../domain/document/identity-document.parser.js'
import { evaluateIdentityParse } from './ocr-quality.js'
import type { PatientRepository } from '../../domain/patient/patient.repository.js'
import { Patient } from '../../domain/patient/patient.entity.js'

export type DocumentUploadResult = {
  document: Document
  suggestedPatient?: SuggestedPatientFields
}

export type OcrStatsResult = {
  summary: Record<string, unknown>
  byType: unknown[]
}

type DocumentRepoWithStats = DocumentRepository & {
  ocrStats?: () => Promise<OcrStatsResult>
}

export class DocumentService {
  constructor(
    private readonly repo: DocumentRepoWithStats,
    private readonly storage?: FileStorage,
    private readonly patients?: PatientRepository,
    private readonly ocrFactory?: (documentType: DocumentType) => DocumentOcrRunner,
  ) {}

  async create(data: DocumentProps) {
    const document = Document.create(data)
    return this.repo.save(document)
  }

  async uploadAndCreate(
    patientId: string,
    documentType: DocumentType,
    filename: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<DocumentUploadResult> {
    if (!this.storage) throw new Error('FileStorage não configurado')
    if (!this.ocrFactory) throw new Error('OCR não configurado')

    const { path, sizeBytes } = await this.storage.upload(patientId, filename, buffer, mimeType)

    let extractedText: string | undefined
    let ocrProcessed = false
    let ocrProvider: string | null = null
    let ocrQualityScore: number | null = null
    let ocrUsedPaid = false
    let ocrParseOk: boolean | null = null
    let ocrFieldsFound: number | null = null
    let ocrFieldsExpected: number | null = null
    let suggestedPatient: SuggestedPatientFields | undefined

    try {
      const ocr = this.ocrFactory(documentType)
      const result = await ocr.extractText(buffer, mimeType)
      extractedText = result.text
      ocrProcessed = true
      ocrProvider = result.provider
      ocrQualityScore = result.qualityScore
      ocrUsedPaid = result.usedPaid

      const evaluated = evaluateIdentityParse(documentType, result.text)
      ocrParseOk = evaluated.metrics.parseOk
      ocrFieldsFound = evaluated.metrics.fieldsFound
      ocrFieldsExpected = evaluated.metrics.fieldsExpected
      if (isIdentityDocumentType(documentType)) {
        suggestedPatient = evaluated.suggested
      }

      console.info('[ocr-metrics]', {
        documentType,
        provider: result.provider,
        qualityScore: result.qualityScore,
        usedPaid: result.usedPaid,
        parseOk: ocrParseOk,
        fieldsFound: ocrFieldsFound,
        fieldsExpected: ocrFieldsExpected,
        attempts: result.attempts,
      })
    } catch (err) {
      console.warn('[ocr-metrics] failed', err instanceof Error ? err.message : err)
      extractedText = undefined
      ocrProcessed = false
      ocrParseOk = false
    }

    const document = Document.create({
      patientId,
      documentType,
      originalFilename: filename,
      storagePath: path,
      fileSizeBytes: sizeBytes,
      mimeType,
      extractedText,
      ocrProcessed,
      ocrProvider,
      ocrQualityScore,
      ocrUsedPaid,
      ocrParseOk,
      ocrFieldsFound,
      ocrFieldsExpected,
    })
    const saved = await this.repo.save(document)

    return { document: saved, suggestedPatient }
  }

  async findById(id: string) {
    const document = await this.repo.findById(id)
    if (!document) throw new NotFoundError('Document', id)
    return document
  }

  async findAll(filter?: DocumentFilter) { return this.repo.findAll(filter) }

  async ocrStats(): Promise<OcrStatsResult> {
    if (!this.repo.ocrStats) return { summary: {}, byType: [] }
    return this.repo.ocrStats()
  }

  async update(id: string, data: Partial<DocumentProps>) {
    const existing = await this.findById(id)
    const updated = Document.restore({ ...existing.toJSON(), ...data })
    return this.repo.update(updated)
  }

  async delete(id: string) {
    await this.findById(id)
    await this.repo.delete(id)
  }

  suggestFromText(documentType: string, text: string): SuggestedPatientFields {
    if (!isIdentityDocumentType(documentType)) return {}
    return parseIdentityDocument(text, documentType)
  }

  async applyIdentityToPatient(
    documentId: string,
    opts: {
      applyCpf?: boolean
      applyName?: boolean
      applyBirthDate?: boolean
      cpf?: string
      name?: string
      birthDate?: Date
      extractedText?: string
    },
  ) {
    if (!this.patients) throw new Error('PatientRepository não configurado')
    const doc = await this.findById(documentId)
    if (!isIdentityDocumentType(doc.documentType)) {
      throw new Error('Arquivo não é documento de identificação')
    }

    if (opts.extractedText != null && opts.extractedText !== (doc.extractedText || '')) {
      await this.update(documentId, { extractedText: opts.extractedText, ocrProcessed: true })
    }

    const text = opts.extractedText ?? doc.extractedText ?? ''
    const suggested = parseIdentityDocument(text, doc.documentType)
    const patient = await this.patients.findById(doc.patientId)
    if (!patient) throw new NotFoundError('Patient', doc.patientId)

    const data = patient.toJSON()
    const next = Patient.restore({
      ...data,
      cpf: opts.applyCpf !== false ? (opts.cpf ?? suggested.cpf ?? data.cpf) : data.cpf,
      name: opts.applyName ? (opts.name ?? suggested.name ?? data.name) : data.name,
      birthDate: opts.applyBirthDate
        ? (opts.birthDate ?? (suggested.birthDate ? new Date(`${suggested.birthDate}T12:00:00`) : data.birthDate))
        : data.birthDate,
      updatedAt: new Date(),
    })

    const saved = await this.patients.update(next)
    return {
      patient: saved,
      suggestedPatient: suggested,
      applied: {
        cpf: opts.applyCpf !== false && !!(opts.cpf ?? suggested.cpf),
        name: !!opts.applyName && !!(opts.name ?? suggested.name),
        birthDate: !!opts.applyBirthDate && !!(opts.birthDate || suggested.birthDate),
      },
    }
  }
}
