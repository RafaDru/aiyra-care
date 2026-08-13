import type { FastifyReply } from 'fastify'
import type { DocumentService } from '../../../application/document/document.service.js'
import type { DocumentInterpretationService } from '../../../application/document/document-interpretation.service.js'
import {
  createDocumentSchema,
  updateDocumentSchema,
  documentParamsSchema,
  documentQuerySchema,
  documentTypeEnum,
  applyIdentitySchema,
} from './document.schema.js'
import { NotFoundError } from '../../../domain/errors.js'
import { isIdentityDocumentType } from '../../../domain/document/identity-document.parser.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess, filterByPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'
import { resolveHandwritingScopeId } from '../handwriting/handwriting-scope.js'

export class DocumentController {
  constructor(
    private readonly service: DocumentService,
    private readonly interpretation?: DocumentInterpretationService,
  ) {}

  private async guardDocument(req: AuthenticatedRequest, reply: FastifyReply, documentId: string) {
    try {
      const doc = await this.service.findById(documentId)
      return guardPatientEntity(req, reply, doc)
    } catch (err) {
      if (err instanceof NotFoundError) {
        reply.status(404).send({ message: err.message })
        return null
      }
      throw err
    }
  }

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createDocumentSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const doc = await this.service.create(parsed.data)
    return reply.status(201).send(doc.toJSON())
  }

  async upload(req: AuthenticatedRequest, reply: FastifyReply) {
    const file = await req.file()
    if (!file) return reply.status(400).send({ message: 'Nenhum arquivo enviado' })

    const fields = file.fields as Record<string, { value: string }>
    const patientId = fields.patientId?.value
    const documentType = fields.documentType?.value

    if (!patientId || !documentType) {
      return reply.status(400).send({ message: 'Campos patientId e documentType são obrigatórios' })
    }
    if (!assertPatientAccess(req, reply, patientId)) return

    const typeParsed = documentTypeEnum.safeParse(documentType)
    if (!typeParsed.success) {
      return reply.status(400).send({ message: `documentType inválido: ${documentType}` })
    }

    const chunks: Buffer[] = []
    for await (const chunk of file.file) { chunks.push(chunk) }
    const buffer = Buffer.concat(chunks)

    try {
      const { document, suggestedPatient } = await this.service.uploadAndCreate(
        patientId,
        typeParsed.data,
        file.filename,
        buffer,
        file.mimetype,
      )
      return reply.status(201).send({
        ...document.toJSON(),
        suggestedPatient: suggestedPatient && Object.keys(suggestedPatient).length ? suggestedPatient : undefined,
        isIdentityDocument: isIdentityDocumentType(typeParsed.data),
      })
    } catch (err) {
      return reply.status(500).send({ message: err instanceof Error ? err.message : 'Erro no upload' })
    }
  }

  async applyIdentity(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = documentParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = applyIdentitySchema.safeParse(req.body ?? {})
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const doc = await this.guardDocument(req, reply, params.data.id)
    if (!doc) return
    try {
      const result = await this.service.applyIdentityToPatient(params.data.id, body.data)
      return reply.send({
        patient: result.patient.toJSON(),
        suggestedPatient: result.suggestedPatient,
        applied: result.applied,
      })
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      return reply.status(400).send({ message: err instanceof Error ? err.message : 'Erro ao aplicar dados' })
    }
  }

  async findById(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = documentParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const doc = await this.guardDocument(req, reply, parsed.data.id)
    if (!doc) return
    return reply.send(doc.toJSON())
  }

  async findAll(req: AuthenticatedRequest, reply: FastifyReply) {
    const query = documentQuerySchema.safeParse(req.query)
    const filter = query.success ? query.data : undefined
    if (filter?.patientId && !assertPatientAccess(req, reply, filter.patientId)) return
    const items = await this.service.findAll(filter)
    return reply.send(filterByPatientAccess(req, items, (i) => i.patientId).map((i) => i.toJSON()))
  }

  async ocrStats(_req: AuthenticatedRequest, reply: FastifyReply) {
    return reply.send(await this.service.ocrStats())
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = documentParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateDocumentSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const existing = await this.guardDocument(req, reply, params.data.id)
    if (!existing) return
    try {
      const d = await this.service.update(params.data.id, body.data)
      return reply.send(d.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async delete(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = documentParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const existing = await this.guardDocument(req, reply, parsed.data.id)
    if (!existing) return
    try {
      await this.service.delete(parsed.data.id)
      return reply.status(204).send()
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async download(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = documentParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const doc = await this.guardDocument(req, reply, parsed.data.id)
    if (!doc) return
    try {
      const file = await this.service.readFile(parsed.data.id)
      const safeName = file.filename.replace(/[^\w\s.-]/g, '_')
      return reply
        .header('Content-Type', file.contentType)
        .header('Content-Disposition', `inline; filename="${safeName}"`)
        .send(file.buffer)
    } catch (err) {
      return err instanceof NotFoundError
        ? reply.status(404).send({ message: err.message })
        : reply.status(500).send({ message: err instanceof Error ? err.message : 'Erro ao baixar arquivo' })
    }
  }

  async interpretHandwriting(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.interpretation) {
      return reply.status(503).send({ message: 'Interpretação de manuscrito não configurada' })
    }
    const parsed = documentParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const doc = await this.guardDocument(req, reply, parsed.data.id)
    if (!doc) return
    try {
    const scopeId = resolveHandwritingScopeId(req)
      const result = await this.interpretation.interpretHandwritingDocument(parsed.data.id, scopeId)
      return reply.send(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro na interpretação'
      if (message === 'HANDWRITING_QUOTA_EXCEEDED') {
        return reply.status(402).send({
          message: 'Créditos de interpretação esgotados. Adquira um pacote para continuar.',
          code: 'HANDWRITING_QUOTA_EXCEEDED',
        })
      }
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      return reply.status(400).send({ message })
    }
  }

  async interpretVaccineCard(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.interpretation) {
      return reply.status(503).send({ message: 'Interpretação não configurada' })
    }
    const parsed = documentParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const doc = await this.guardDocument(req, reply, parsed.data.id)
    if (!doc) return
    try {
      const scopeId = resolveHandwritingScopeId(req)
      const result = await this.interpretation.interpretVaccineCardDocument(parsed.data.id, scopeId)
      return reply.send(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro na interpretação'
      if (message === 'HANDWRITING_QUOTA_EXCEEDED') {
        return reply.status(402).send({
          message: 'Créditos de interpretação esgotados. Adquira um pacote para continuar.',
          code: 'HANDWRITING_QUOTA_EXCEEDED',
        })
      }
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      return reply.status(400).send({ message })
    }
  }

  async getInterpretation(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.interpretation) {
      return reply.status(503).send({ message: 'Interpretação de manuscrito não configurada' })
    }
    const parsed = documentParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const doc = await this.guardDocument(req, reply, parsed.data.id)
    if (!doc) return
    try {
      return reply.send(await this.interpretation.getInterpretation(parsed.data.id))
    } catch (err) {
      return err instanceof NotFoundError
        ? reply.status(404).send({ message: err.message })
        : reply.status(500).send({ message: err instanceof Error ? err.message : 'Erro' })
    }
  }
}
