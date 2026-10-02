import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditWrite, readStdinJson } from './lib/audit.mjs'
import { shouldBypassRtk } from './lib/rtk-bypass.mjs'

const ROOT = join(fileURLToPath(new URL('../..', import.meta.url)))
const LOCAL_RTK = join(ROOT, '.local/bin/rtk')

function resolveRtkBinary() {
  if (existsSync(LOCAL_RTK)) return LOCAL_RTK
  const which = spawnSync('bash', ['-lc', 'command -v rtk'], { encoding: 'utf8' })
  const path = String(which.stdout ?? '').trim()
  return path || null
}

function rtkVersionOk(rtkPath) {
  const out = spawnSync(rtkPath, ['--version'], { encoding: 'utf8' })
  const text = `${out.stdout ?? ''}${out.stderr ?? ''}`
  const m = text.match(/(\d+)\.(\d+)\.(\d+)/)
  if (!m) return false
  const major = Number(m[1])
  const minor = Number(m[2])
  return major > 0 || minor >= 23
}

function extractCommand(input) {
  const args = input.tool_input ?? input.arguments ?? input.input ?? {}
  const fromTool = args.command
  if (fromTool) return String(fromTool)
  if (input.command) return String(input.command)
  return ''
}

try {
  const input = readStdinJson()
  const tool = String(input.tool_name ?? input.toolName ?? '')
  if (tool && tool !== 'Shell') {
    process.stdout.write('{}')
    process.exit(0)
  }

  const command = extractCommand(input)
  if (!command || shouldBypassRtk(command)) {
    if (command && shouldBypassRtk(command)) {
      auditWrite('rtk', { event: 'bypass', command: command.slice(0, 240) })
    }
    process.stdout.write('{}')
    process.exit(0)
  }

  const rtkPath = resolveRtkBinary()
  if (!rtkPath || !rtkVersionOk(rtkPath)) {
    process.stdout.write('{}')
    process.exit(0)
  }

  const env = { ...process.env }
  delete env.RTK_REWRITE_HOST
  const rewritten = spawnSync(rtkPath, ['rewrite', command], {
    encoding: 'utf8',
    env,
  })
  const rc = rewritten.status ?? 1
  const newCmd = String(rewritten.stdout ?? '').trim()

  if (rc !== 0 && rc !== 3) {
    process.stdout.write('{}')
    process.exit(0)
  }
  if (!newCmd || newCmd === command) {
    process.stdout.write('{}')
    process.exit(0)
  }

  auditWrite('rtk', {
    event: 'rewrite',
    from: command.slice(0, 200),
    to: newCmd.slice(0, 200),
  })

  const permission = rc === 3 ? 'ask' : 'allow'
  process.stdout.write(
    JSON.stringify({
      continue: true,
      permission,
      updated_input: { command: newCmd },
    }),
  )
} catch (err) {
  auditWrite('rtk', { event: 'hookError', error: String(err) })
  process.stdout.write('{}')
}
