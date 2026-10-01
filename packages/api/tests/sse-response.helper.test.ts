import { describe, expect, it, vi } from 'vitest'
import { writeSseResponseHead } from '../src/infrastructure/http/sse-response.helper.js'

describe('writeSseResponseHead', () => {
  it('reflects request Origin for CORS (SSE raw responses)', () => {
    const res = { writeHead: vi.fn() } as unknown as import('node:http').ServerResponse
    writeSseResponseHead(
      { headers: { origin: 'http://127.0.0.1:4173' } } as import('node:http').IncomingMessage,
      res,
    )
    expect(res.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
        'Content-Type': 'text/event-stream',
        Vary: 'Origin',
      }),
    )
  })
})
