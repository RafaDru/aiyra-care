import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/domain/llm/llm-policy.js', () => ({
  avaMaxOutputTokens: () => 512,
  opencodeGoApiKey: () => 'test-go-key',
  opencodeGoBaseUrl: () => 'https://opencode.example/go/v1',
  opencodeGoChatModel: () => 'deepseek-v4-flash',
  opencodeZenApiKey: () => 'test-zen-key',
  opencodeZenBaseUrl: () => 'https://opencode.example/zen/v1',
  opencodeZenFreeChatModel: () => 'deepseek-v4-flash-free',
  usageFromApiOrEstimate: () => ({
    tokensIn: 10,
    tokensOut: 5,
    tokensTotal: 15,
    usageSource: 'api' as const,
  }),
}))

describe('opencode-chat.provider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('envia x-opencode-session no fetch Go', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { completeWithOpenCodeGo } = await import('../src/infrastructure/llm/opencode-chat.provider.js')
    await completeWithOpenCodeGo(
      [{ role: 'user', content: 'hi' }],
      'free',
      { sessionId: 'conv-uuid-123' },
    )

    expect(fetchMock).toHaveBeenCalledOnce()
    const init = fetchMock.mock.calls[0][1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['x-opencode-session']).toBe('conv-uuid-123')
  })
})
