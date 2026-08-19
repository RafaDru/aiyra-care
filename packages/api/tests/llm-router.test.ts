import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { LlmMessage } from '../src/domain/llm/llm.types.js'

const zenMock = vi.fn()
const goMock = vi.fn()
const geminiMock = vi.fn()
const groqMock = vi.fn()

vi.mock('../src/infrastructure/llm/opencode-chat.provider.js', () => ({
  completeWithOpenCodeZenFree: (...args: unknown[]) => zenMock(...args),
  completeWithOpenCodeGo: (...args: unknown[]) => goMock(...args),
}))

vi.mock('../src/infrastructure/llm/llm-chat.providers.js', () => ({
  completeWithGemini: (...args: unknown[]) => geminiMock(...args),
  completeWithGroq: (...args: unknown[]) => groqMock(...args),
}))

const messages: LlmMessage[] = [{ role: 'user', content: 'teste' }]

function ok(provider: string) {
  return {
    text: 'ok',
    provider,
    model: 'm',
    tier: 'free' as const,
    usage: { tokensIn: 1, tokensOut: 1, tokensTotal: 2, usageSource: 'estimated' as const },
  }
}

describe('LlmRouter cascade', () => {
  beforeEach(() => {
    vi.resetModules()
    zenMock.mockReset()
    goMock.mockReset()
    geminiMock.mockReset()
    groqMock.mockReset()
    zenMock.mockRejectedValue(new Error('zen fail'))
    goMock.mockResolvedValue(ok('opencode-go'))
    geminiMock.mockResolvedValue(ok('gemini'))
    groqMock.mockResolvedValue(ok('groq'))
    process.env.OPENCODE_ZEN_API_KEY = 'zen-key'
    process.env.OPENCODE_GO_API_KEY = 'go-key'
    process.env.GEMINI_API_KEY = 'gem'
    process.env.GROQ_API_KEY = 'groq'
  })

  afterEach(() => {
    delete process.env.OPENCODE_ZEN_API_KEY
    delete process.env.OPENCODE_GO_API_KEY
    delete process.env.GEMINI_API_KEY
    delete process.env.GROQ_API_KEY
  })

  it('pula Zen sem consentimento e usa Go', async () => {
    const { LlmRouter } = await import('../src/infrastructure/llm/llm-router.js')
    const router = new LlmRouter()
    const res = await router.completeChat(messages, 'free', { allowLlmDataSharing: false })
    expect(zenMock).not.toHaveBeenCalled()
    expect(goMock).toHaveBeenCalled()
    expect(res.provider).toBe('opencode-go')
  })

  it('tenta Zen primeiro com consentimento', async () => {
    zenMock.mockResolvedValue(ok('opencode-zen'))
    const { LlmRouter } = await import('../src/infrastructure/llm/llm-router.js')
    const router = new LlmRouter()
    const res = await router.completeChat(messages, 'free', { allowLlmDataSharing: true })
    expect(zenMock).toHaveBeenCalled()
    expect(goMock).not.toHaveBeenCalled()
    expect(res.provider).toBe('opencode-zen')
  })
})
