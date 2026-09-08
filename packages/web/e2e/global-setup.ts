async function globalSetup() {
  if (process.env.E2E_SMOKE_ONLY === '1') return

  const api = process.env.VITE_API_URL ?? 'http://127.0.0.1:3010'
  try {
    const res = await fetch(`${api}/health`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) {
      throw new Error(`API health HTTP ${res.status}`)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      `E2E requer API em ${api} — suba com npm run up. Detalhe: ${msg}`,
    )
  }
}

export default globalSetup
