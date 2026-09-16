import type { FastifyInstance } from 'fastify'
import { listConnectors } from '@aiyra-care/connect'

export async function connectRoutes(app: FastifyInstance) {
  app.get('/connect/connectors', async () => {
    return listConnectors().map((c) => ({
      id: c.id,
      label: c.label,
      category: c.category,
      authProfile: c.authProfile,
      capabilities: c.capabilities,
      legacyPortalType: c.legacyPortalType,
      subBrands: c.subBrands,
    }))
  })
}
