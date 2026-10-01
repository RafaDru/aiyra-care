import type { IncomingMessage, ServerResponse } from 'node:http'

/** Raw SSE responses bypass @fastify/cors — mirror origin for browser clients (e2e preview :4173). */
export function writeSseResponseHead(
  req: IncomingMessage,
  res: ServerResponse,
  extra?: Record<string, string>,
) {
  const origin = req.headers.origin
  const headers: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    ...extra,
  }
  if (typeof origin === 'string' && origin.length > 0) {
    headers['Access-Control-Allow-Origin'] = origin
    headers.Vary = 'Origin'
  } else {
    headers['Access-Control-Allow-Origin'] = '*'
  }
  res.writeHead(200, headers)
}
