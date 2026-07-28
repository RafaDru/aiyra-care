import type { FastifyInstance } from 'fastify'
import { AuthorizationController } from './authorization.controller.js'
import { AuthorizationPgRepository } from '../../persistence/authorization.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function authorizationRoutes(app: FastifyInstance) {
  const controller = new AuthorizationController(new AuthorizationPgRepository(pgPool))
  app.post('/authorizations', controller.create.bind(controller))
  app.get('/authorizations', controller.findAll.bind(controller))
  app.get('/authorizations/:id', controller.findById.bind(controller))
  app.patch('/authorizations/:id', controller.update.bind(controller))
  app.delete('/authorizations/:id', controller.delete.bind(controller))
}
