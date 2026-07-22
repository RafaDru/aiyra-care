import type { FastifyReply, FastifyRequest } from 'fastify'
import type { PatientService } from '../../../application/patient/patient.service.js'
import { createPatientSchema, updatePatientSchema, patientParamsSchema } from './patient.schema.js'
import { NotFoundError } from '../../../domain/errors.js'

export class PatientController {
  constructor(private readonly service: PatientService) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createPatientSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const patient = await this.service.create(parsed.data)
    return reply.status(201).send(patient.toJSON())
  }

  async findById(req: FastifyRequest, reply: FastifyReply) {
    const parsed = patientParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const patient = await this.service.findById(parsed.data.id)
      return reply.send(patient.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async findAll(_req: FastifyRequest, reply: FastifyReply) {
    const patients = await this.service.findAll()
    return reply.send(patients.map(p => p.toJSON()))
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    const params = patientParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updatePatientSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const patient = await this.service.update(params.data.id, body.data)
      return reply.send(patient.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const parsed = patientParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      await this.service.delete(parsed.data.id)
      return reply.status(204).send()
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }
}
