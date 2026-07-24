import type { FastifyInstance } from 'fastify'
import { ScraperController } from './scraper.controller.js'

export async function scraperRoutes(app: FastifyInstance) {
  const ctrl = new ScraperController()
  app.post('/scraper/:portal', ctrl.scrape.bind(ctrl))
}
