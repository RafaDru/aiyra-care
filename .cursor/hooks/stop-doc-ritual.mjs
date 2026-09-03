import { auditWrite, readStdinJson } from './lib/audit.mjs'
import { clearDocRitualPending, readDocRitualPending } from './lib/doc-ritual.mjs'

const input = readStdinJson()
const loopCount = input.loop_count ?? input.loopCount ?? 0

if (loopCount >= 2) {
  process.stdout.write('{}')
  process.exit(0)
}

const pending = readDocRitualPending()
if (!pending) {
  process.stdout.write('{}')
  process.exit(0)
}

auditWrite('doc-ritual', {
  event: 'stop_followup',
  pending,
})

const followup = [
  'Ritual de documentação pendente nesta sessão.',
  `Última edição de produto: ${pending.filePath}`,
  'Antes de encerrar: atualize docs/roadmap.json + docs/features/<id>.md (+ docs/help se usuário).',
  'Consulte docs/AGENT_BOOTSTRAP.md e docs/DOCUMENTATION_SYSTEM.md.',
  'Depois confirme o que foi documentado.',
].join(' ')

clearDocRitualPending()

process.stdout.write(JSON.stringify({ followup_message: followup }))
