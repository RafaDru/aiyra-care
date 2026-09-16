/** Lê env de webhook Cursor Automation — nomes canônicos + fallback legado. */

export function cleanCursorAutomationKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  let key = raw.replace(/^["']|["']$/g, '')
  key = key.replace(/^Authorization:\s*/i, '')
  key = key.replace(/^Authorization\s+/i, '')
  key = key.replace(/^Bearer\s+/i, '')
  return key.length ? key : undefined
}

function readEnv(env: NodeJS.ProcessEnv, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = env[key]?.trim()
    if (value) return value
  }
  return undefined
}

/** Lane Suporte Desenvolvimento (`support_report`). */
export function resolveDevelopmentSupportAutomationWebhookUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return readEnv(
    env,
    'CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL',
    'CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL',
  )
}

export function resolveDevelopmentSupportAutomationWebhookKey(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return cleanCursorAutomationKey(readEnv(
    env,
    'CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_KEY',
    'CURSOR_SUPPORT_AUTOMATION_WEBHOOK_KEY',
  ))
}

/** Lane Suporte SRE (`ops_alert`). */
export function resolveSreSupportAutomationWebhookUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return readEnv(
    env,
    'CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL',
    'CURSOR_OPS_ALERT_AUTOMATION_WEBHOOK_URL',
    'CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL',
    'CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL',
  )
}

export function resolveSreSupportAutomationWebhookKey(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const dedicated = cleanCursorAutomationKey(readEnv(
    env,
    'CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_KEY',
    'CURSOR_OPS_ALERT_AUTOMATION_WEBHOOK_KEY',
  ))
  if (dedicated) return dedicated
  const hasDedicatedSreUrl = Boolean(readEnv(
    env,
    'CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL',
    'CURSOR_OPS_ALERT_AUTOMATION_WEBHOOK_URL',
  ))
  if (hasDedicatedSreUrl) return undefined
  return resolveDevelopmentSupportAutomationWebhookKey(env)
}
