import type { FastifyRequest, FastifyReply } from 'fastify'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Session, SessionSection } from './session.types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const HISTORICO_PATH = resolve(__dirname, '../../../../../../docs/HISTORICO.md')

function parseSessions(): Session[] {
  const content = readFileSync(HISTORICO_PATH, 'utf-8')
  const lines = content.split('\n')
  const sessions: Session[] = []
  let current: Session | null = null

  for (const line of lines) {
    const sessionMatch = line.match(/^## \[(\d{4}-\d{2}-\d{2})\] - (.+)$/)
    if (sessionMatch) {
      if (current) sessions.push(current)
      current = { date: sessionMatch[1], title: sessionMatch[2], sections: [] }
      continue
    }

    if (!current) continue

    const sectionMatch = line.match(/^### (.+)$/)
    if (sectionMatch) {
      current.sections.push({ heading: sectionMatch[1], items: [] })
      continue
    }

    const itemMatch = line.match(/^- \[([ x])\] (.+)$/)
    if (itemMatch && current.sections.length > 0) {
      const sec = current.sections[current.sections.length - 1]
      sec.items.push({ text: itemMatch[2], done: itemMatch[1] === 'x' })
      continue
    }

    if (current.sections.length === 0 && line.trim() && !line.startsWith('#')) {
      current.description = (current.description || '') + line.trim() + ' '
    }
  }

  if (current) sessions.push(current)
  return sessions
}

export class SessionController {
  async list(_req: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.send(parseSessions())
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar sessões'
      return reply.status(500).send({ message })
    }
  }
}
