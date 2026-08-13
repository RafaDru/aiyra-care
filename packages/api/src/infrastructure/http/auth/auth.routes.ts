import type { FastifyInstance } from 'fastify'
import Stripe from 'stripe'
import { pgPool } from '../../../db/postgres.js'
import { AuthService } from '../../../application/auth/auth.service.js'
import { AccountDeletionService } from '../../../application/account/account-deletion.service.js'
import { SupabaseAuthAdapter } from '../../auth/supabase-auth.adapter.js'
import { AppAccountPgRepository, PatientMembershipPgRepository } from '../../persistence/app-account.pg.repository.js'
import { PatientPgRepository } from '../../persistence/patient.pg.repository.js'
import { PatientService } from '../../../application/patient/patient.service.js'
import { GcsFileStorage } from '../../storage/gcs.storage.js'
import { AuthController } from './auth.controller.js'
import { createAuthHook } from './auth.middleware.js'

function buildAuthService(): AuthService | null {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !serviceKey) return null
  const patientRepo = new PatientPgRepository(pgPool)
  return new AuthService(
    new SupabaseAuthAdapter(url, serviceKey),
    new AppAccountPgRepository(pgPool),
    new PatientMembershipPgRepository(pgPool),
    new PatientService(patientRepo),
  )
}

function buildAccountDeletionService(): AccountDeletionService | null {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !serviceKey) return null

  const adapter = new SupabaseAuthAdapter(url, serviceKey)
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim()
  let stripeCancel: ((subscriptionId: string) => Promise<void>) | undefined
  if (stripeKey) {
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' })
    stripeCancel = async (subscriptionId: string) => {
      await stripe.subscriptions.cancel(subscriptionId)
    }
  }

  return new AccountDeletionService(pgPool, new GcsFileStorage(), adapter, stripeCancel)
}

export async function authRoutes(app: FastifyInstance) {
  const authService = buildAuthService()
  if (!authService) {
    app.log.warn('SUPABASE_URL/SUPABASE_SERVICE_ROLE ausentes — rotas /auth desativadas')
    return
  }

  const accountDeletion = buildAccountDeletionService()
  const controller = new AuthController(authService, accountDeletion)
  const memberships = new PatientMembershipPgRepository(pgPool)
  const optionalAuth = createAuthHook(authService, false, memberships)
  const requireAuth = createAuthHook(authService, true, memberships)

  app.addHook('onRequest', optionalAuth)

  app.get('/auth/me', controller.me.bind(controller))
  app.post('/auth/sync', controller.sync.bind(controller))
  app.post('/auth/complete-profile', { preHandler: requireAuth }, controller.completeProfile.bind(controller))
  app.delete('/auth/account', { preHandler: requireAuth }, controller.deleteAccount.bind(controller))
}

export function getAuthService(): AuthService | null {
  return buildAuthService()
}
