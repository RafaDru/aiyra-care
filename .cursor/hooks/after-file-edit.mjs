import { auditWrite, readStdinJson } from './lib/audit.mjs'

const input = readStdinJson()
auditWrite('edits', {
  event: 'afterFileEdit',
  filePath: input.filePath ?? input.path ?? null,
  tool: input.toolName ?? input.tool ?? null,
})
process.stdout.write('{}')
