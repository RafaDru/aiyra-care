import type { FastifyReply } from 'fastify'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROADMAP_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../docs/roadmap.json')

export class RoadmapController {
  get(_req: unknown, reply: FastifyReply) {
    try {
      const raw = readFileSync(ROADMAP_PATH, 'utf-8')
      const data = JSON.parse(raw)
      return reply.send(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao ler roadmap'
      return reply.status(500).send({ message })
    }
  }
}
