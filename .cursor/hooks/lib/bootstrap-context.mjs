import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const BOOTSTRAP_PATH = join(ROOT, 'docs/AGENT_BOOTSTRAP.md')
const STATE_DIR = join(ROOT, '.cursor/state')

/** Texto compacto para additional_context (hooks sessionStart / postToolUse). */
export function loadBootstrapContext() {
  if (!existsSync(BOOTSTRAP_PATH)) {
    return 'AiyraCare: leia docs/AGENT_BOOTSTRAP.md e docs/DOCUMENTATION_SYSTEM.md antes de alterar produto.'
  }
  const body = readFileSync(BOOTSTRAP_PATH, 'utf8')
  return [
    '--- AIYRACARE AGENT BOOTSTRAP (obrigatório após compactação ou nova sessão) ---',
    body,
    '--- Fim bootstrap — siga o índice acima antes de inferir comportamento pelo código ---',
  ].join('\n')
}

export function statePath(name) {
  return join(STATE_DIR, name)
}
