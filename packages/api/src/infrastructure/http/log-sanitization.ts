/**
 * Sanitização de logs — sem PHI/credenciais em stdout (LGPD).
 * Ver docs/OBSERVABILITY.md · épico obs-log-sanitization.
 */

/** Rotas cujo body nunca deve aparecer em logs (mesmo em debug manual). */
export const SENSITIVE_BODY_ROUTE_PREFIXES = [
  '/patients/',
  '/ava/',
  '/telemetry/',
  '/documents',
  '/handwriting',
  '/clinical-export',
  '/billing/webhook',
] as const

const SENSITIVE_BODY_ROUTE_SUFFIXES = [
  '/ava/chat',
  '/documents',
] as const

const FORBIDDEN_KEY = /^(message|content|text|reply|body|password|token|secret|credential|extractedText|ocrLayout|history|attachment|patientContext|encrypted|rawBody|prompt|transcript|ocr)/i

const LOG_REDACT_PATHS = [
  'req.body',
  'body',
  'rawBody',
  'message',
  'content',
  'reply',
  'text',
  'extractedText',
  'ocrLayout',
  'history',
  'password',
  'encryptedPassword',
  'encryptedSessionToken',
  'attachmentBlock',
  'patientContextBlock',
  'entityPinBlock',
  'operationalBlock',
  'bundle',
  'properties.message',
  'properties.content',
  'properties.text',
  'headers.authorization',
  'headers.cookie',
  '*.password',
  '*.encryptedPassword',
  '*.encryptedSessionToken',
  '*.message',
  '*.content',
  '*.extractedText',
  '*.ocrLayout',
  '*.history',
  '*.reply',
  '*.rawBody',
]

const MAX_LOG_STRING = 128

export function isSensitiveBodyRoute(url: string | undefined): boolean {
  if (!url) return false
  const path = url.split('?')[0]
  if (SENSITIVE_BODY_ROUTE_PREFIXES.some((p) => path.startsWith(p) && path.includes('/ava/chat'))) return true
  if (path.includes('/ava/chat')) return true
  if (path.startsWith('/documents')) return true
  if (path.startsWith('/telemetry/')) return true
  if (SENSITIVE_BODY_ROUTE_SUFFIXES.some((s) => path.endsWith(s) || path.includes(s))) return true
  return false
}

export function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[DEPTH_LIMIT]'
  if (value === null || value === undefined) return value
  if (typeof value === 'string') {
    if (value.length <= MAX_LOG_STRING) return value
    return `${value.slice(0, 48)}…[len=${value.length}]`
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeLogValue(item, depth + 1))
  }
  if (typeof value !== 'object') return String(value).slice(0, MAX_LOG_STRING)

  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEY.test(key)) {
      out[key] = '[REDACTED]'
      continue
    }
    out[key] = sanitizeLogValue(child, depth + 1)
  }
  return out
}

export function sanitizeLogObject(value: unknown): Record<string, unknown> {
  const sanitized = sanitizeLogValue(value, 0)
  if (sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
    return sanitized as Record<string, unknown>
  }
  return { value: sanitized }
}

export function createApiLoggerConfig(): {
  level: string
  redact: { paths: string[]; censor: string }
  serializers: {
    req: (req: import('fastify').FastifyRequest) => Record<string, unknown>
    res: (res: import('fastify').FastifyReply) => Record<string, unknown>
    err: (err: Error) => Record<string, unknown>
  }
  hooks: {
    logMethod: (
      args: unknown[],
      method: (...a: unknown[]) => unknown,
      level: number,
    ) => void
  }
} {
  return {
    level: process.env.LOG_LEVEL?.trim() || 'info',
    redact: {
      paths: LOG_REDACT_PATHS,
      censor: '[REDACTED]',
    },
    serializers: {
      req(req) {
        const path = req.url?.split('?')[0] ?? ''
        return {
          method: req.method,
          url: path,
          sensitiveBody: isSensitiveBodyRoute(path),
          remoteAddress: req.ip,
        }
      },
      res(res) {
        return { statusCode: res.statusCode }
      },
      err(err) {
        return {
          type: err.name,
          message: err.message,
          code: (err as { code?: string }).code,
          stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
        }
      },
    },
    hooks: {
      logMethod(args, method) {
        if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
          args[0] = sanitizeLogObject(args[0])
        }
        method.apply(this, args)
      },
    },
  }
}
