/** Em dev o Vite faz proxy à API (porta 3010). */
const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:3010')

export type SyncProgressStreamEvent = 'progress' | 'heartbeat' | 'snapshot'

export interface SyncProgressStreamPayload {
  step: string
  message: string
  status: string
  portalType?: string
  stepDetails?: Record<string, { status: 'running' | 'success' | 'failed'; message: string }>
  novelty?: import('./api.types.js').SyncNoveltySummary
  result?: SyncJobProgressStreamResult
  event?: SyncProgressStreamEvent
}

export interface SyncJobProgressStreamResult {
  exams: number
  medicalRecords: number
  authorizations: number
  authorizationItems: number
  updatedAuthorizations: number
  total: number
  warnings?: string[]
  novelty?: import('./api.types.js').SyncNoveltySummary
  beneficiaryDetails?: unknown[]
  unmatchedBeneficiaries?: unknown[]
  authorizationDetails?: unknown[]
}

function parseSseBlock(block: string): { event: SyncProgressStreamEvent; data: string } | null {
  const lines = block.split('\n')
  let event: SyncProgressStreamEvent = 'progress'
  let data = ''
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim() as SyncProgressStreamEvent
    else if (line.startsWith('data:')) data += line.slice(5).trim()
  }
  if (!data) return null
  return { event, data }
}

/**
 * SSE via fetch (suporta Authorization Bearer — EventSource nativo não).
 * Retorna função para fechar o stream.
 */
export function openSyncJobStream(
  jobId: string,
  onPayload: (payload: SyncProgressStreamPayload, event: SyncProgressStreamEvent) => void,
  onDisconnect?: () => void,
): () => void {
  const controller = new AbortController()

  const run = async () => {
    const { ensureAccessToken } = await import('./supabase.js')
    const token = await ensureAccessToken()
    const headers: Record<string, string> = { Accept: 'text/event-stream' }
    if (token) headers.Authorization = `Bearer ${token}`

    try {
      const res = await fetch(`${BASE_URL}/integration-links/sync-progress/${jobId}/stream`, {
        headers,
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`Stream HTTP ${res.status}`)
      const reader = res.body?.getReader()
      if (!reader) throw new Error('Stream sem body')

      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let sep = buffer.indexOf('\n\n')
        while (sep >= 0) {
          const block = buffer.slice(0, sep)
          buffer = buffer.slice(sep + 2)
          const parsed = parseSseBlock(block)
          if (parsed) {
            const payload = JSON.parse(parsed.data) as SyncProgressStreamPayload
            onPayload({ ...payload, event: parsed.event }, parsed.event)
          }
          sep = buffer.indexOf('\n\n')
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        onDisconnect?.()
      }
      if (!controller.signal.aborted && err instanceof Error && err.name !== 'AbortError') {
        console.warn('[sync-stream]', err.message)
      }
    }
  }

  void run()
  return () => controller.abort()
}
