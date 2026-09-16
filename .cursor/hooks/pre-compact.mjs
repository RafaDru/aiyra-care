import { mkdirSync, writeFileSync } from 'node:fs'
import { auditWrite, readStdinJson } from './lib/audit.mjs'
import { statePath } from './lib/bootstrap-context.mjs'

const FLAG = statePath('post-compact.json')

const input = readStdinJson()

auditWrite('compaction', {
  event: 'preCompact',
  trigger: input.trigger ?? null,
  contextUsagePercent: input.context_usage_percent ?? input.contextUsagePercent ?? null,
  messageCount: input.message_count ?? input.messageCount ?? null,
  messagesToCompact: input.messages_to_compact ?? input.messagesToCompact ?? null,
})

mkdirSync(statePath('..'), { recursive: true })
writeFileSync(
  FLAG,
  JSON.stringify({ at: new Date().toISOString(), trigger: input.trigger ?? 'unknown' }),
  'utf8',
)

const msg =
  input.trigger === 'manual'
    ? 'Contexto compactado — o agente receberá o índice AGENT_BOOTSTRAP na próxima ferramenta.'
    : 'Contexto compactado automaticamente — índice de docs será re-injetado.'

process.stdout.write(JSON.stringify({ user_message: msg }))
