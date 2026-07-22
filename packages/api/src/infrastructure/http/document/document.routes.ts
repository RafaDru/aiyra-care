import type { FastifyInstance } from 'fastify'
import { DocumentController } from './document.controller.js'
import { DocumentService } from '../../../application/document/document.service.js'
import { DocumentPgRepository } from '../../persistence/document.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function documentRoutes(app: FastifyInstance) {
  const controller = new DocumentController(new DocumentService(new DocumentPgRepository(pgPool)))
  app.post('/documents', controller.create.bind(controller))
  app.get('/documents', controller.findAll.bind(controller))
  app.get('/documents/:id', controller.findById.bind(controller))
  app.patch('/documents/:id', controller.update.bind(controller))
  app.delete('/documents/:id', controller.delete.bind(controller))
}
