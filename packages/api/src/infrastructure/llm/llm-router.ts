import type { LlmCompletionResult, LlmMessage, LlmRouterOptions, LlmTier } from '../../domain/llm/llm.types.js'
import { chunkReplyForSse } from '../../domain/llm/ava-reply-stream.js'
import {
  geminiFlashLiteChatModel,
  geminiProChatModel,
  opencodeGoApiKey,
  opencodeZenApiKey,
} from '../../domain/llm/llm-policy.js'
import { completeWithGemini, completeWithGroq, streamWithGemini } from './llm-chat.providers.js'
import { completeWithOpenCodeGo, completeWithOpenCodeZenFree } from './opencode-chat.provider.js'
import { resolveOpenCodeSessionId } from '../../domain/llm/opencode-session.js'

type Attempt = { provider: string; ok: boolean; error?: string }

/**
 * Cascata Ava:
 * 1. OpenCode Zen DeepSeek Free — só com `allowLlmDataSharing`
 * 2. OpenCode Go DeepSeek — retenção zero (plano Go)
 * 3. Gemini Flash
 * 4. Groq
 * 5. Gemini Pro / fallback
 */
export class LlmRouter {
  async completeChat(
    messages: LlmMessage[],
    tier: LlmTier,
    routerOpts?: LlmRouterOptions,
  ): Promise<LlmCompletionResult> {
    return this.runCascade(messages, tier, routerOpts, false)
  }

  async completeJson(
    messages: LlmMessage[],
    tier: LlmTier,
    routerOpts?: LlmRouterOptions,
  ): Promise<LlmCompletionResult> {
    return this.runCascade(messages, tier, routerOpts, true)
  }

  private async runCascade(
    messages: LlmMessage[],
    tier: LlmTier,
    routerOpts: LlmRouterOptions | undefined,
    jsonMode: boolean,
  ): Promise<LlmCompletionResult> {
    const attempts: Attempt[] = []
    const suffix = jsonMode ? '-json' : ''
    const maxTokens = jsonMode ? 512 : undefined
    const jsonOpts = jsonMode ? { jsonMode: true, maxTokens } : { maxTokens }
    const opencodeSessionId = resolveOpenCodeSessionId(
      routerOpts?.opencodeSessionId,
      ['llm-router', jsonMode ? 'json' : 'chat', tier],
    )
    const opencodeOpts = { ...jsonOpts, sessionId: opencodeSessionId }
    const deltaState = { sent: false }
    const onReplyDelta = routerOpts?.onReplyDelta
    const emitDelta = onReplyDelta
      ? (chunk: string) => {
          deltaState.sent = true
          onReplyDelta(chunk)
        }
      : undefined

    const emitChunkedFallback = (text: string) => {
      if (!emitDelta || deltaState.sent) return
      for (const chunk of chunkReplyForSse(text)) emitDelta(chunk)
      if (text) deltaState.sent = true
    }

    const tryProvider = async (
      label: string,
      fn: () => Promise<LlmCompletionResult>,
    ): Promise<LlmCompletionResult | null> => {
      try {
        const result = await fn()
        emitChunkedFallback(result.text)
        attempts.push({ provider: label, ok: true })
        return result
      } catch (err) {
        attempts.push({
          provider: label,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        })
        return null
      }
    }

    if (routerOpts?.allowLlmDataSharing && opencodeZenApiKey()) {
      const zen = await tryProvider(`opencode-zen-free${suffix}`, () =>
        completeWithOpenCodeZenFree(messages, tier, opencodeOpts))
      if (zen) return zen
    }

    if (opencodeGoApiKey()) {
      const go = await tryProvider(`opencode-go${suffix}`, () =>
        completeWithOpenCodeGo(messages, tier, opencodeOpts))
      if (go) return go
    }

    if (process.env.GEMINI_API_KEY?.trim()) {
      const flash = await tryProvider(`gemini-flash${suffix}`, () => {
        if (!jsonMode && emitDelta) {
          return streamWithGemini(messages, tier, {
            model: geminiFlashLiteChatModel(),
            maxTokens,
            onDelta: emitDelta,
          })
        }
        return completeWithGemini(messages, tier, {
          model: geminiFlashLiteChatModel(),
          maxTokens,
        })
      })
      if (flash) return flash
    }

    if (process.env.GROQ_API_KEY?.trim()) {
      const groq = await tryProvider(`groq${suffix}`, () =>
        completeWithGroq(messages, tier, jsonOpts))
      if (groq) return groq
    }

    if (process.env.GEMINI_API_KEY?.trim()) {
      const geminiPro = await tryProvider(`gemini-pro${suffix}`, () =>
        completeWithGemini(messages, tier, {
          model: geminiProChatModel(),
          maxTokens,
        }))
      if (geminiPro) return geminiPro
    }

    const detail = attempts.map((a) => `${a.provider}: ${a.error || 'ok'}`).join('; ')
    throw new Error(`Nenhum provedor LLM disponível (${detail})`)
  }
}
