import { auditWrite, readStdinJson } from './lib/audit.mjs'
import { loadBootstrapContext } from './lib/bootstrap-context.mjs'
import { clearDocRitualPending } from './lib/doc-ritual.mjs'

const input = readStdinJson()

auditWrite('sessions', {
  event: 'sessionStart',
  workspace: input.workspaceFolder ?? null,
  sessionId: input.sessionId ?? input.session_id ?? null,
})

clearDocRitualPending()

process.stdout.write(
  JSON.stringify({
    additional_context: loadBootstrapContext(),
  }),
)
