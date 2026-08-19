import type { FastifyInstance } from 'fastify'
import { EmergencyController } from './emergency.controller.js'
import { EmergencyService } from '../../../application/emergency/emergency.service.js'
import { EmergencyPgRepository } from '../../persistence/emergency.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function emergencyRoutes(app: FastifyInstance) {
  const service = new EmergencyService(new EmergencyPgRepository(pgPool))
  const controller = new EmergencyController(service)

  app.get('/emergency/directory', controller.listDirectory.bind(controller))
  app.get('/emergency/contacts', controller.listContacts.bind(controller))
  app.post('/emergency/contacts', controller.createContact.bind(controller))
  app.patch('/emergency/contacts/:id', controller.updateContact.bind(controller))
  app.delete('/emergency/contacts/:id', controller.deleteContact.bind(controller))
}
