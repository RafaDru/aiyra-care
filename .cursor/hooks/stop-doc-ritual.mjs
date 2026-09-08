import { auditWrite, readStdinJson } from './lib/audit.mjs'
import { clearDocRitualPending, readDocRitualPending } from './lib/doc-ritual.mjs'
import {
  clearQaRitualPending,
  isQaRitualBlocking,
  qaRitualFollowupMessage,
  readQaRitualPending,
} from './lib/qa-ritual.mjs'

const input = readStdinJson()
const loopCount = input.loop_count ?? input.loopCount ?? 0

if (loopCount >= 3) {
  process.stdout.write('{}')
  process.exit(0)
}

const docPending = readDocRitualPending()
const qaBlocking = isQaRitualBlocking()
const qaPending = readQaRitualPending()

if (!docPending && !qaBlocking) {
  process.stdout.write('{}')
  process.exit(0)
}

const parts = []

if (docPending) {
  auditWrite('doc-ritual', { event: 'stop_followup', pending: docPending })
  parts.push(
    'Ritual de documentação pendente.',
    `Última edição de produto: ${docPending.filePath}`,
    'Atualize docs/roadmap.json + docs/features/<id>.md (+ docs/help se usuário).',
    'Consulte docs/AGENT_BOOTSTRAP.md e docs/DOCUMENTATION_SYSTEM.md.',
  )
  clearDocRitualPending()
}

if (qaBlocking && qaPending) {
  auditWrite('qa-ritual', { event: 'stop_followup', pending: qaPending })
  parts.push(qaRitualFollowupMessage(qaPending))
  clearQaRitualPending()
}

const followup = parts.join(' ')

process.stdout.write(JSON.stringify({ followup_message: followup }))
