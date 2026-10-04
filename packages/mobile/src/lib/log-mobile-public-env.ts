/** Loga EXPO_PUBLIC_* no Metro (auditoria OAuth / LAN). */
export function logMobilePublicEnv(): void {
  const keys = Object.keys(process.env)
    .filter((k) => k.startsWith('EXPO_PUBLIC_'))
    .sort()
  const snapshot: Record<string, string> = {}
  for (const k of keys) {
    const v = process.env[k] ?? ''
    snapshot[k] = v.includes('KEY') || k.includes('ANON') ? `${v.slice(0, 8)}…` : v
  }
  console.log('[Aiyra mobile] EXPO_PUBLIC_* bundle', snapshot)
}
