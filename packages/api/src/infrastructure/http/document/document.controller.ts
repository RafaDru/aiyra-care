import type { FastifyRequest, FastifyReply } from 'fastify'
import type { DocumentService } from '../../../application/document/document.service.js'
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

export class DocumentController {
  constructor(private readonly service: DocumentService) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createDocumentSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const doc = await this.service.create(parsed.data)
    return reply.status(201).send(doc.toJSON())
  }

  async upload(req: FastifyRequest, reply: FastifyReply) {
    const file = await req.file()
    if (!file) return reply.status(400).send({ message: 'Nenhum arquivo enviado' })

    const fields = file.fields as Record<string, { value: string }>
    const patientId = fields.patientId?.value
    const documentType = fields.documentType?.value

    if (!patientId || !documentType) {
      return reply.status(400).send({ message: 'Campos patientId e documentType são obrigatórios' })
    }

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

  async applyIdentity(req: FastifyRequest, reply: FastifyReply) {
    const params = documentParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = applyIdentitySchema.safeParse(req.body ?? {})
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
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

  async findById(req: FastifyRequest, reply: FastifyReply) {
    const parsed = documentParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try { const d = await this.service.findById(parsed.data.id); return reply.send(d.toJSON()) }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async findAll(req: FastifyRequest, reply: FastifyReply) {
    const query = documentQuerySchema.safeParse(req.query)
    const items = await this.service.findAll(query.success ? query.data : undefined)
    return reply.send(items.map(i => i.toJSON()))
  }

  async ocrStats(_req: FastifyRequest, reply: FastifyReply) {
    return reply.send(await this.service.ocrStats())
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    const params = documentParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateDocumentSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try { const d = await this.service.update(params.data.id, body.data); return reply.send(d.toJSON()) }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const parsed = documentParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try { await this.service.delete(parsed.data.id); return reply.status(204).send() }
    catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }
}
