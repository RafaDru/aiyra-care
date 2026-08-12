/** Em dev o Vite faz proxy à API (porta 3010). */
const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:3010')

export type PatientSyncStreamEvent = 'completed' | 'failed' | 'heartbeat'

export interface PatientSyncCompletionPayload {
  jobId: string
  integrationLinkId: string
  patientId: string
  portalType: string
  status: 'success' | 'failed'
  trigger: string
  message?: string
  novelty?: import('./api.types.js').SyncNoveltySummary
  finishedAt: string
}

function parseSseBlock(block: string): { event: PatientSyncStreamEvent; data: string } | null {
  const lines = block.split('\n')
  let event: PatientSyncStreamEvent = 'completed'
  let data = ''
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim() as PatientSyncStreamEvent
    else if (line.startsWith('data:')) data += line.slice(5).trim()
  }
  if (!data) return null
  return { event, data }
}

/**
 * SSE de sync terminal por paciente (completed/failed).
 * Retorna função para fechar o stream.
 */
export function openPatientSyncStream(
  patientId: string,
  onPayload: (payload: PatientSyncCompletionPayload, event: PatientSyncStreamEvent) => void,
  onDisconnect?: () => void,
): () => void {
  const controller = new AbortController()

  const run = async () => {
    const { ensureAccessToken } = await import('./supabase.js')
    const token = await ensureAccessToken()
    const headers: Record<string, string> = { Accept: 'text/event-stream' }
    if (token) headers.Authorization = `Bearer ${token}`

    try {
      const res = await fetch(`${BASE_URL}/patients/${patientId}/sync-completions/stream`, {
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
          if (parsed && parsed.event !== 'heartbeat') {
            const payload = JSON.parse(parsed.data) as PatientSyncCompletionPayload
            onPayload(payload, parsed.event)
          }
          sep = buffer.indexOf('\n\n')
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        onDisconnect?.()
      }
      if (!controller.signal.aborted && err instanceof Error && err.name !== 'AbortError') {
        console.warn('[patient-sync-stream]', err.message)
      }
    }
  }

  void run()
  return () => controller.abort()
}
