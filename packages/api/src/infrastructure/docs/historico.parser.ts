import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface HistoricoSessionItem {
  text: string
  done: boolean
}

export interface HistoricoSessionSection {
  heading: string
  items: HistoricoSessionItem[]
}

export interface HistoricoSession {
  date: string
  title: string
  description?: string
  sections: HistoricoSessionSection[]
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const HISTORICO_PATH = resolve(__dirname, '../../../../../docs/HISTORICO.md')

export function parseHistoricoMarkdown(content: string): HistoricoSession[] {
  const lines = (content ?? '').replace(/\r/g, '').split('\n')
  const sessions: HistoricoSession[] = []
  let current: HistoricoSession | null = null

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

export function readHistoricoSessions(): HistoricoSession[] {
  const content = readFileSync(HISTORICO_PATH, 'utf-8')
  return parseHistoricoMarkdown(content)
}
