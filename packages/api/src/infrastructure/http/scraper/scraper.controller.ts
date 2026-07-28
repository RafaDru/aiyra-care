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

    const portal = params.data.portal
    const data = body.data

    if (portal === 'conectesus') {
      if (!data.cpf || data.cpf.replace(/\D/g, '').length !== 11) {
        return reply.status(400).send({ message: 'CPF com 11 dígitos é obrigatório para ConecteSUS' })
      }
    } else {
      if (!data.password) {
        return reply.status(400).send({ message: 'Senha é obrigatória para este portal' })
      }
      if (portal === 'unimed' && !data.email) {
        return reply.status(400).send({ message: 'E-mail é obrigatório para Unimed BH' })
      }
      if (portal !== 'unimed' && (!data.cpf || data.cpf.replace(/\D/g, '').length < 11)) {
        return reply.status(400).send({ message: 'CPF é obrigatório para este portal' })
      }
    }

    try {
      const result = await service.scrape(portal, {
        cpf: data.cpf?.replace(/\D/g, '') || '',
        email: data.email,
        password: data.password || '',
        birthDate: data.birthDate,
        insuranceMembershipNumber: data.insuranceMembershipNumber,
      })
      return reply.send(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro no scraper'
      return reply.status(500).send({ message })
    }
  }
}
