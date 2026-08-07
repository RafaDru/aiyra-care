import type { FastifyInstance } from 'fastify'
import { InsurancePlanController } from './insurance-plan.controller.js'
import { InsurancePlanService } from '../../../application/insurance-plan/insurance-plan.service.js'
import { InsurancePlanPgRepository } from '../../persistence/insurance-plan.pg.repository.js'
import { PlanMembershipPgRepository } from '../../persistence/plan-membership.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'

export async function insurancePlanRoutes(app: FastifyInstance) {
  const service = new InsurancePlanService(
    new InsurancePlanPgRepository(pgPool),
    new PlanMembershipPgRepository(pgPool),
  )
  const controller = new InsurancePlanController(service)
  app.get('/plan-memberships', controller.findMembershipsByPatient.bind(controller))
}
