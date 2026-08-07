import type { FastifyRequest, FastifyReply } from 'fastify'
import type { CarePlaceService } from '../../../application/care-place/care-place.service.js'
import { carePlaceSearchSchema } from './care-place.schema.js'

export class CarePlaceController {
  constructor(private readonly service: CarePlaceService) {}

  async search(req: FastifyRequest, reply: FastifyReply) {
    const parsed = carePlaceSearchSchema.safeParse(req.query)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const rows = await this.service.search(parsed.data.q, parsed.data.limit)
    return reply.send(
      rows.map((r) => ({
        id: r.id,
        displayName: r.displayName,
        normalizedName: r.normalizedName,
        usageCount: r.usageCount,
        firstSeenAt: r.firstSeenAt,
        lastUsedAt: r.lastUsedAt,
      })),
    )
  }
}
