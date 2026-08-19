import Groq from 'groq-sdk'
import type { LlmCompletionResult, LlmMessage, LlmTier } from '../../domain/llm/llm.types.js'
import {
  avaMaxOutputTokens,
  geminiChatModel,
  geminiFlashLiteChatModel,
  geminiProChatModel,
  groqChatModel,
  usageFromApiOrEstimate,
} from '../../domain/llm/llm-policy.js'
import { completeWithOpenCodeGo, completeWithOpenCodeZenFree } from './opencode-chat.provider.js'

const groq = process.env.GROQ_API_KEY?.trim() ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null

export async function completeWithGroq(
  messages: LlmMessage[],
  tier: LlmTier,
  opts?: { jsonMode?: boolean; maxTokens?: number },
): Promise<LlmCompletionResult> {
  if (!groq) throw new Error('GROQ_API_KEY não configurada')
  const model = groqChatModel()
  const completion = await groq.chat.completions.create({
    model,
    temperature: 0.1,
    max_tokens: opts?.maxTokens ?? avaMaxOutputTokens(),
    response_format: opts?.jsonMode ? { type: 'json_object' } : undefined,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  })

  const text = completion.choices[0]?.message?.content?.trim() ?? ''
  if (!text) throw new Error('Groq retornou resposta vazia')

  const promptText = messages.map((m) => m.content).join('\n')
  const usage = usageFromApiOrEstimate(
    {
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens,
    },
    promptText,
    text,
  )

  return {
    text,
    provider: `groq:${model}`,
    model,
    tier,
    usage,
  }
}

export async function completeWithGemini(
  messages: LlmMessage[],
  tier: LlmTier,
  opts?: { maxTokens?: number; model?: string },
): Promise<LlmCompletionResult> {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) throw new Error('GEMINI_API_KEY não configurada')
  const model = opts?.model ?? geminiChatModel()

  const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content)
  const nonSystem = messages.filter((m) => m.role !== 'system')
  const systemInstruction = systemParts.length ? systemParts.join('\n\n') : undefined

  const contents = nonSystem.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: opts?.maxTokens ?? avaMaxOutputTokens(),
    },
  }
  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`Gemini chat falhou (${res.status}): ${errBody.slice(0, 300)}`)
  }

  const json = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    usageMetadata?: {
      promptTokenCount?: number
      candidatesTokenCount?: number
      totalTokenCount?: number
    }
  }

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  if (!text) throw new Error('Gemini retornou resposta vazia')

  const promptText = messages.map((m) => m.content).join('\n')
  const usage = usageFromApiOrEstimate(
    {
      promptTokens: json.usageMetadata?.promptTokenCount,
      completionTokens: json.usageMetadata?.candidatesTokenCount,
      totalTokens: json.usageMetadata?.totalTokenCount,
    },
    promptText,
    text,
  )

  return {
    text,
    provider: `gemini:${model}`,
    model,
    tier,
    usage,
  }
}
