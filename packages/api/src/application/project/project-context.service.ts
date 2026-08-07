import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ProjectContext, ProjectContextSnapshot } from './project-context.types.js'
import { readHistoricoSessions } from '../../infrastructure/docs/historico.parser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PROJECT_ROOT = resolve(__dirname, '../../../../..')
const PROJECT_CONTEXT_PATH = resolve(PROJECT_ROOT, 'docs/project-context.json')
const MIGRATIONS_DIR = resolve(PROJECT_ROOT, 'database/relational')

function loadSnapshot(): ProjectContextSnapshot {
  const raw = readFileSync(PROJECT_CONTEXT_PATH, 'utf-8')
  const parsed = JSON.parse(raw) as ProjectContextSnapshot
  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
  }
}

function listMigrations(): string[] {
  try {
    return readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()
  } catch {
    return []
  }
}

export class ProjectContextService {
  build(): ProjectContext {
    const snapshot = loadSnapshot()
    const sessions = readHistoricoSessions()

    return {
      ...snapshot,
      migrations: listMigrations(),
      historico: {
        sessionCount: sessions.length,
        sessions,
        latestSession: sessions[sessions.length - 1],
      },
    }
  }
}
