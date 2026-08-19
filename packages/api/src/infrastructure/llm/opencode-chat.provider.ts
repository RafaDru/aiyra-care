import type { LlmCompletionResult, LlmMessage, LlmTier } from '../../domain/llm/llm.types.js'
import {
  avaMaxOutputTokens,
  opencodeGoApiKey,
  opencodeGoBaseUrl,
  opencodeGoChatModel,
  opencodeZenApiKey,
  opencodeZenBaseUrl,
  opencodeZenFreeChatModel,
  usageFromApiOrEstimate,
} from '../../domain/llm/llm-policy.js'

async function completeWithOpenCodeChatCompletions(
  messages: LlmMessage[],
  tier: LlmTier,
  opts: {
    providerPrefix: string
    baseUrl: string
    apiKey: string
    model: string
    jsonMode?: boolean
    maxTokens?: number
  },
): Promise<LlmCompletionResult> {
  const base = opts.baseUrl.replace(/\/$/, '')

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: 0.1,
      max_tokens: opts.maxTokens ?? avaMaxOutputTokens(),
      response_format: opts.jsonMode ? { type: 'json_object' } : undefined,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`${opts.providerPrefix} falhou (${res.status}): ${errBody.slice(0, 300)}`)
  }

  const json = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
  }

  const text = json.choices?.[0]?.message?.content?.trim() ?? ''
  if (!text) throw new Error(`${opts.providerPrefix} retornou resposta vazia`)

  const promptText = messages.map((m) => m.content).join('\n')
  const usage = usageFromApiOrEstimate(
    {
      promptTokens: json.usage?.prompt_tokens,
      completionTokens: json.usage?.completion_tokens,
      totalTokens: json.usage?.total_tokens,
    },
    promptText,
    text,
  )

  return {
    text,
    provider: `${opts.providerPrefix}:${opts.model}`,
    model: opts.model,
    tier,
    usage,
  }
}

/** OpenCode Zen — DeepSeek gratuito (requer consentimento de compartilhamento). */
export async function completeWithOpenCodeZenFree(
  messages: LlmMessage[],
  tier: LlmTier,
  opts?: { jsonMode?: boolean; maxTokens?: number },
): Promise<LlmCompletionResult> {
  const key = opencodeZenApiKey()
  if (!key) throw new Error('OPENCODE_ZEN_API_KEY não configurada')
  const model = opencodeZenFreeChatModel()
  return completeWithOpenCodeChatCompletions(messages, tier, {
    providerPrefix: 'opencode-zen',
    baseUrl: opencodeZenBaseUrl(),
    apiKey: key,
    model,
    jsonMode: opts?.jsonMode,
    maxTokens: opts?.maxTokens,
  })
}

/** OpenCode Go — DeepSeek com retenção zero (plano Go). */
export async function completeWithOpenCodeGo(
  messages: LlmMessage[],
  tier: LlmTier,
  opts?: { jsonMode?: boolean; maxTokens?: number },
): Promise<LlmCompletionResult> {
  const key = opencodeGoApiKey()
  if (!key) throw new Error('OPENCODE_GO_API_KEY não configurada')
  const model = opencodeGoChatModel()
  return completeWithOpenCodeChatCompletions(messages, tier, {
    providerPrefix: 'opencode-go',
    baseUrl: opencodeGoBaseUrl(),
    apiKey: key,
    model,
    jsonMode: opts?.jsonMode,
    maxTokens: opts?.maxTokens,
  })
}
