import type { FastifyRequest, FastifyReply } from 'fastify'
import { AgenticScraperService } from '../../../application/scraper/agentic-scraper.service.js'
import { scrapeSchema, portalParamSchema } from './scraper.schema.js'

const service = new AgenticScraperService()

export class ScraperController {
  async scrape(req: FastifyRequest, reply: FastifyReply) {
    const params = portalParamSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: 'Portal inválido' })

    const body = scrapeSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    try {
      const result = await service.scrape(params.data.portal, {
        cpf: body.data.cpf,
      })
      return reply.send(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro no scraper'
      return reply.status(500).send({ message })
    }
  }
}
