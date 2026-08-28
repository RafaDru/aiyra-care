import type { AvaEntityPin } from './ava-dock-bus.js'
import type { AvaActivityEvent, AvaChatResponse } from './api.types.js'

const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:3010')

export interface AvaChatRequestBody {
  message: string
  healthThreadId?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  allowLlmDataSharing?: boolean
  entityPin?: AvaEntityPin
  streamActivity?: boolean
  conversationId?: string
  attachmentDocumentId?: string
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const { ensureAccessToken, supabaseConfigured } = await import('./supabase.js')
  const token = await ensureAccessToken()
  if (supabaseConfigured && !token) {
    throw new Error('Sessão não disponível — faça login novamente')
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

/** POST /ava/chat com SSE de atividade (ferramentas + reflexão). */
export async function avaChatWithActivityStream(
  patientId: string,
  body: AvaChatRequestBody,
  onActivity: (event: AvaActivityEvent) => void,
  onReplyDelta?: (chunk: string) => void,
): Promise<AvaChatResponse> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/patients/${patientId}/ava/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...body, streamActivity: true }),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(errBody.message || `HTTP ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('Stream indisponível')

  const decoder = new TextDecoder()
  let buffer = ''
  let result: AvaChatResponse | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const lines = part.split('\n')
      let eventName = 'message'
      let dataLine = ''
      for (const line of lines) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        if (line.startsWith('data:')) dataLine = line.slice(5).trim()
      }
      if (!dataLine) continue
      const payload = JSON.parse(dataLine) as unknown
      if (eventName === 'activity') onActivity(payload as AvaActivityEvent)
      if (eventName === 'reply_delta') {
        const delta = payload as { text?: string }
        if (delta.text && onReplyDelta) onReplyDelta(delta.text)
      }
      if (eventName === 'complete') result = payload as AvaChatResponse
      if (eventName === 'error') {
        const err = payload as { message?: string; code?: string }
        throw new Error(err.message || err.code || 'Ava chat failed')
      }
    }
  }

  if (!result) throw new Error('Resposta Ava incompleta')
  return result
}
