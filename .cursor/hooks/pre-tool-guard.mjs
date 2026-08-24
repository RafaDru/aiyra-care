import { auditWrite, readStdinJson } from './lib/audit.mjs'

try {
  const input = readStdinJson()
  const tool = String(input.tool_name ?? input.toolName ?? '')
  const args = input.tool_input ?? input.arguments ?? input.input ?? {}

  auditWrite('tools', {
    event: 'preToolUse',
    tool,
    path: args.path ?? args.file_path ?? args.target_file ?? args.filePath ?? null,
  })

  const path = String(args.path ?? args.file_path ?? args.target_file ?? args.filePath ?? '')
  const BLOCK_PATH = [
    /\.env$/i,
    /\.env\./i,
    /credentials\.json$/i,
    /secrets?\./i,
    /CRYPTO_KEY/i,
  ]

  for (const re of BLOCK_PATH) {
    if (path && re.test(path)) {
      process.stdout.write(
        JSON.stringify({
          permission: 'deny',
          user_message: 'Edição de arquivo sensível bloqueada (.env, credenciais). Use variáveis de ambiente locais.',
          agent_message: `preToolUse blocked path: ${path}`,
        }),
      )
      process.exit(0)
    }
  }

  process.stdout.write(JSON.stringify({ permission: 'allow' }))
} catch (err) {
  auditWrite('tools', { event: 'preToolUseError', error: String(err) })
  process.stdout.write(JSON.stringify({ permission: 'allow' }))
}
