import { readFileSync, unlinkSync, existsSync } from 'node:fs'
import { readStdinJson } from './lib/audit.mjs'
import { loadBootstrapContext, statePath } from './lib/bootstrap-context.mjs'

const FLAG = statePath('post-compact.json')
const TTL_MS = 15 * 60 * 1000

const input = readStdinJson()
void input

if (!existsSync(FLAG)) {
  process.stdout.write('{}')
  process.exit(0)
}

let payload
try {
  payload = JSON.parse(readFileSync(FLAG, 'utf8'))
} catch {
  unlinkSync(FLAG)
  process.stdout.write('{}')
  process.exit(0)
}

const age = Date.now() - new Date(payload.at).getTime()
if (age > TTL_MS) {
  unlinkSync(FLAG)
  process.stdout.write('{}')
  process.exit(0)
}

unlinkSync(FLAG)

const context = loadBootstrapContext()
process.stdout.write(
  JSON.stringify({
    additional_context: `${context}\n\n[Re-injetado após compactação em ${payload.at}]`,
  }),
)
