import type { FastifyRequest } from 'fastify'
import { SupabaseAuthAdapter } from '../../api/src/infrastructure/auth/supabase-auth.adapter.js'

export type OpsConsoleDeploymentTier = 'integration' | 'preview' | 'production'

const GITHUB_DEFECT_CI_WEBHOOK_PATH = '/api/webhooks/github/defect-ci'
const GITHUB_DEFECT_MERGE_WEBHOOK_PATH = '/api/webhooks/github/defect-merge'

let cachedAdapter: SupabaseAuthAdapter | null | undefined

export function normalizeOpsConsolePath(url: string): string {
  const path = url.split('?')[0]
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

export function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase()
  return h === '127.0.0.1' || h === 'localhost' || h === '::1' || h === '::ffff:127.0.0.1'
}

/**
 * Default on for preview/production tiers; notebook integration defaults off unless OPS_CONSOLE_AUTH_ENABLED=1.
 * OPS_CONSOLE_AUTH_ENABLED=0 only honored when OPS_CONSOLE_HOST is loopback.
 */
export function resolveOpsConsoleAuthEnabled(
  deploymentTier: OpsConsoleDeploymentTier,
  host: string,
): boolean {
  const raw = process.env.OPS_CONSOLE_AUTH_ENABLED?.trim().toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'no') {
    if (!isLoopbackHost(host)) return true
    return false
  }
  if (raw === '1' || raw === 'true' || raw === 'yes') return true
  return deploymentTier === 'preview' || deploymentTier === 'production'
}

export function parseOperatorEmailAllowlist(raw = process.env.OPS_CONSOLE_OPERATOR_EMAILS): Set<string> {
  const set = new Set<string>()
  for (const part of (raw ?? '').split(',')) {
    const email = part.trim().toLowerCase()
    if (email) set.add(email)
  }
  return set
}

export function isOperatorEmailAllowlisted(
  email: string | null | undefined,
  allowlist = parseOperatorEmailAllowlist(),
): boolean {
  if (!email?.trim()) return false
  if (allowlist.size === 0) return false
  return allowlist.has(email.trim().toLowerCase())
}

export function isSupabaseConfiguredForOpsConsole(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE?.trim())
}

function getSupabaseAuthAdapter(): SupabaseAuthAdapter | null {
  if (cachedAdapter !== undefined) return cachedAdapter
  const url = process.env.SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE?.trim()
  if (!url || !key) {
    cachedAdapter = null
    return null
  }
  cachedAdapter = new SupabaseAuthAdapter(url, key)
  return cachedAdapter
}

export function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice(7).trim()
  return token || null
}

export async function verifyOpsConsoleOperatorToken(
  accessToken: string,
  allowlist = parseOperatorEmailAllowlist(),
): Promise<{ id: string; email: string } | null> {
  const adapter = getSupabaseAuthAdapter()
  if (!adapter) return null
  const user = await adapter.verifyAccessToken(accessToken)
  if (!user?.email || !isOperatorEmailAllowlisted(user.email, allowlist)) return null
  return { id: user.id, email: user.email }
}

export type OpsConsoleAuthExemptInput = {
  method: string
  path: string
}

export function isOpsConsoleStaticAssetPath(path: string): boolean {
  if (path.startsWith('/@') || path.startsWith('/node_modules/') || path.startsWith('/src/')) {
    return true
  }
  return /\.[a-zA-Z0-9]+$/.test(path)
}

export function isOpsConsoleAuthExempt(input: OpsConsoleAuthExemptInput): boolean {
  const method = input.method.toUpperCase()
  const path = normalizeOpsConsolePath(input.path)

  if (method === 'GET' && path === '/health') return true
  if (path === '/api/auth/status' || path === '/mock/ch-layout') return true
  if (method === 'GET' && isOpsConsoleStaticAssetPath(path)) return true

  if (method === 'POST' && path === '/api/analysis-queue/callback') return true
  if (method === 'POST' && /^\/api\/analysis-queue\/[^/]+\/triage-started$/.test(path)) return true
  if (method === 'POST' && path === '/api/platform-defects/review-callback') return true
  if (method === 'POST' && path === '/api/platform-defects/callback') return true
  if (method === 'POST' && path === GITHUB_DEFECT_CI_WEBHOOK_PATH) return true
  if (method === 'POST' && path === GITHUB_DEFECT_MERGE_WEBHOOK_PATH) return true

  return false
}

export type OpsConsoleAuthenticatedRequest = FastifyRequest & {
  opsConsoleOperatorEmail?: string
}

export function resetOpsConsoleAuthAdapterCacheForTests(): void {
  cachedAdapter = undefined
}