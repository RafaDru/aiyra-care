/**
 * Comandos que não devem passar pelo RTK — saída integral preserva QA, E2E e debug.
 * Ver docs/CURSOR_RTK.md
 */

/** @param {string} command */
export function shouldBypassRtk(command) {
  if (process.env.AIYRA_NO_RTK === '1') return true
  if (/\bAIYRA_NO_RTK=1\b/.test(command)) return true

  const cmd = String(command ?? '')
  if (!cmd.trim()) return true

  for (const re of RTK_BYPASS_PATTERNS) {
    if (re.test(cmd)) return true
  }
  return false
}

export const RTK_BYPASS_PATTERNS = [
  /\bqa:run\b/i,
  /\bqa:run-all\b/i,
  /\bqa:list\b/i,
  /qa-suite\.mjs/i,
  /\bplaywright\b/i,
  /\btest:e2e\b/i,
  /packages\/web\/e2e\//i,
  /\bnpx vitest\b/i,
  /\bvitest run\b/i,
  /\bnpm run test\b/i,
  /\btest:critical\b/i,
  /\btest:ops\b/i,
  /\bOPS_SMOKE_FULL=1\b/i,
  /\bpromotion:gates\b/i,
  /\bnpm run build\b/i,
  /\bnpx tsc\b/i,
  /\btsc --/i,
  /cursor-cloud-environment-build-logs/i,
  /environment-build-logs/i,
]
