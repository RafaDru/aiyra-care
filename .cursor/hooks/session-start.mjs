import { auditWrite, readStdinJson } from './lib/audit.mjs'

const input = readStdinJson()
auditWrite('sessions', {
  event: 'sessionStart',
  workspace: input.workspaceFolder ?? null,
  sessionId: input.sessionId ?? null,
})
process.stdout.write('{}')
