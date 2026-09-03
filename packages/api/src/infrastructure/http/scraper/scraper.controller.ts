import type { FastifyRequest, FastifyReply } from 'fastify'
import { pgPool } from '../../../db/postgres.js'
import { PublicHealthScrapeService } from '../../../application/scraper/public-health-scrape.service.js'
import { AgenticScraperService } from '../../../application/scraper/agentic-scraper.service.js'
import { scrapeSchema, portalParamSchema } from './scraper.schema.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'

const agenticService = new AgenticScraperService()

export class ScraperController {
  async scrape(req: FastifyRequest, reply: FastifyReply) {
    const authReq = req as AuthenticatedRequest
    const params = portalParamSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: 'Portal inválido' })

    const body = scrapeSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const portal = params.data.portal
    const data = body.data

    const govBrInteractive = portal === 'conectesus' || portal === 'caderneta'

    if (portal === 'conectesus') {
      if (!data.cpf || data.cpf.replace(/\D/g, '').length !== 11) {
        return reply.status(400).send({ message: 'CPF com 11 dígitos é obrigatório para ConecteSUS' })
      }
    } else if (!govBrInteractive) {
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

    if (govBrInteractive && !authReq.accountId) {
      return reply.status(401).send({ message: 'Não autenticado' })
    }

    try {
      if (portal === 'conectesus') {
        const publicHealth = new PublicHealthScrapeService(pgPool)
        const result = await publicHealth.scrapeConecteSUS(
          authReq.accountId!,
          data.cpf!.replace(/\D/g, ''),
        )
        return reply.send(result)
      }
      if (portal === 'caderneta') {
        const publicHealth = new PublicHealthScrapeService(pgPool)
        const result = await publicHealth.scrapeCaderneta(authReq.accountId!)
        return reply.send(result)
      }

      const result = await agenticService.scrape(portal, {
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
