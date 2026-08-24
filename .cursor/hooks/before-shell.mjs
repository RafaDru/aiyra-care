import { auditWrite, readStdinJson } from './lib/audit.mjs'

const input = readStdinJson()
const command = String(input.command ?? '')

auditWrite('shell', {
  event: 'beforeShellExecution',
  command,
})

const DENY = [
  /git\s+push\s+.*--force/i,
  /git\s+push\s+-f\b/i,
  /git\s+reset\s+--hard/i,
  /git\s+clean\s+-fd/i,
  /\brm\s+-rf\b/i,
  /del\s+\/s/i,
  /Remove-Item\s+.*-Recurse/i,
]

const ASK = [
  /git\s+commit/i,
  /git\s+push/i,
  /npm\s+publish/i,
]

for (const re of DENY) {
  if (re.test(command)) {
    process.stdout.write(
      JSON.stringify({
        permission: 'deny',
        user_message: 'Comando bloqueado pela política de hooks do projeto (operação destrutiva ou push forçado).',
        agent_message: `Hook beforeShellExecution denied: ${command}`,
      }),
    )
    process.exit(0)
  }
}

for (const re of ASK) {
  if (re.test(command)) {
    process.stdout.write(
      JSON.stringify({
        permission: 'ask',
        user_message: 'Confirme commit/push/publicação — o hook registrou o comando em docs/dev-audit/shell/.',
        agent_message: 'Shell command requires explicit user approval per project hooks.',
      }),
    )
    process.exit(0)
  }
}

process.stdout.write(JSON.stringify({ permission: 'allow' }))
