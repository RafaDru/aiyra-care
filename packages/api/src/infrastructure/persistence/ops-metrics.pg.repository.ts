import type { Pool } from 'pg'
import type {
  AvaProviderMixRow,
  AvaTokenPercentiles,
  ProductEventCounts,
  SyncPortalStatsRow,
  SyncRecentFailureRow,
  SyncStuckJobRow,
} from '../../domain/ops/ops-metrics.types.js'

function mapPercentiles(
  row: Record<string, unknown> | undefined,
  windowHours: number,
): AvaTokenPercentiles {
  if (!row) {
    return {
      windowHours,
      turns: 0,
      tokensTotalSum: 0,
      tokensInSum: 0,
      tokensOutSum: 0,
      p50Tokens: null,
      p95Tokens: null,
    }
  }
  return {
    windowHours,
    turns: Number(row.turns ?? 0),
    tokensTotalSum: Number(row.tokens_total_sum ?? 0),
    tokensInSum: Number(row.tokens_in_sum ?? 0),
    tokensOutSum: Number(row.tokens_out_sum ?? 0),
    p50Tokens: row.p50_tokens != null ? Number(row.p50_tokens) : null,
    p95Tokens: row.p95_tokens != null ? Number(row.p95_tokens) : null,
  }
}

export class OpsMetricsPgRepository {
  constructor(private readonly pool: Pool) {}

  async avaTokenPercentiles(windowHours: number): Promise<AvaTokenPercentiles> {
    const { rows } = await this.pool.query(
      `SELECT
         COUNT(*)::int AS turns,
         COALESCE(SUM(tokens_total), 0)::bigint AS tokens_total_sum,
         COALESCE(SUM(tokens_in), 0)::bigint AS tokens_in_sum,
         COALESCE(SUM(tokens_out), 0)::bigint AS tokens_out_sum,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY tokens_total) AS p50_tokens,
         percentile_cont(0.95) WITHIN GROUP (ORDER BY tokens_total) AS p95_tokens
       FROM llm_usage_events
       WHERE feature = 'ava_chat'
         AND created_at >= NOW() - make_interval(hours => $1::int)`,
      [windowHours],
    )
    return mapPercentiles(rows[0] as Record<string, unknown>, windowHours)
  }

  async avaProviderMix(windowHours: number): Promise<AvaProviderMixRow[]> {
    const { rows } = await this.pool.query(
      `SELECT
         COALESCE(provider, 'unknown') AS provider,
         COALESCE(model, 'unknown') AS model,
         COUNT(*)::int AS turns,
         COALESCE(SUM(tokens_total), 0)::bigint AS tokens_total
       FROM llm_usage_events
       WHERE feature = 'ava_chat'
         AND created_at >= NOW() - make_interval(hours => $1::int)
       GROUP BY provider, model
       ORDER BY turns DESC
       LIMIT 12`,
      [windowHours],
    )
    return rows.map((row) => ({
      provider: row.provider as string,
      model: row.model as string,
      turns: Number(row.turns),
      tokensTotal: Number(row.tokens_total),
    }))
  }

  async syncPortalStats24h(): Promise<SyncPortalStatsRow[]> {
    const { rows } = await this.pool.query(
      `SELECT
         portal_type AS portal_type,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
         COUNT(*) FILTER (WHERE status = 'success')::int AS success,
         ROUND(
           100.0 * COUNT(*) FILTER (WHERE status = 'failed') / NULLIF(COUNT(*), 0),
           1
         )::float AS fail_rate_pct
       FROM sync_jobs
       WHERE status IN ('success', 'failed')
         AND COALESCE(finished_at, started_at) >= NOW() - INTERVAL '24 hours'
       GROUP BY portal_type
       ORDER BY total DESC`,
    )
    return rows.map((row) => ({
      portalType: row.portal_type as string,
      total: Number(row.total),
      failed: Number(row.failed),
      success: Number(row.success),
      failRatePct: Number(row.fail_rate_pct ?? 0),
    }))
  }

  async syncStuckJobs(): Promise<SyncStuckJobRow[]> {
    const { rows } = await this.pool.query(
      `SELECT
         id AS job_id,
         integration_link_id,
         portal_type,
         status,
         started_at,
         ROUND(EXTRACT(EPOCH FROM (NOW() - started_at)) / 60.0, 1)::float AS minutes_running
       FROM sync_jobs
       WHERE status IN ('pending', 'running')
         AND started_at < NOW() - INTERVAL '15 minutes'
       ORDER BY started_at ASC
       LIMIT 20`,
    )
    return rows.map((row) => ({
      jobId: row.job_id as string,
      integrationLinkId: row.integration_link_id as string,
      portalType: row.portal_type as string,
      status: row.status as string,
      startedAt: new Date(row.started_at as string).toISOString(),
      minutesRunning: Number(row.minutes_running),
    }))
  }

  async syncRecentFailures(limit = 10): Promise<SyncRecentFailureRow[]> {
    const { rows } = await this.pool.query(
      `SELECT id AS job_id, portal_type, integration_link_id, error, finished_at
       FROM sync_jobs
       WHERE status = 'failed'
         AND finished_at >= NOW() - INTERVAL '48 hours'
       ORDER BY finished_at DESC
       LIMIT $1`,
      [limit],
    )
    return rows.map((row) => ({
      jobId: row.job_id as string,
      portalType: row.portal_type as string,
      integrationLinkId: row.integration_link_id as string,
      error: row.error as string | null,
      finishedAt: new Date(row.finished_at as string).toISOString(),
    }))
  }

  async productEventCountsSinceHours(hours: number): Promise<ProductEventCounts> {
    const { rows } = await this.pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE event_name = 'ava_chat_completed')::int AS ava_chat_completed,
         COUNT(*) FILTER (WHERE event_name = 'ava_chat_failed')::int AS ava_chat_failed,
         COUNT(*) FILTER (WHERE event_name = 'ava_quota_blocked')::int AS ava_quota_blocked
       FROM product_events
       WHERE created_at >= NOW() - make_interval(hours => $1::int)`,
      [hours],
    )
    const row = rows[0] as Record<string, unknown>
    return {
      windowHours: hours,
      avaChatCompleted: Number(row.ava_chat_completed ?? 0),
      avaChatFailed: Number(row.ava_chat_failed ?? 0),
      avaQuotaBlocked: Number(row.ava_quota_blocked ?? 0),
    }
  }

  async productEventCountsSinceMinutes(minutes: number): Promise<{
    windowMinutes: number
    avaChatCompleted: number
    avaChatFailed: number
  }> {
    const { rows } = await this.pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE event_name = 'ava_chat_completed')::int AS ava_chat_completed,
         COUNT(*) FILTER (WHERE event_name = 'ava_chat_failed')::int AS ava_chat_failed
       FROM product_events
       WHERE created_at >= NOW() - make_interval(mins => $1::int)`,
      [minutes],
    )
    const row = rows[0] as Record<string, unknown>
    return {
      windowMinutes: minutes,
      avaChatCompleted: Number(row.ava_chat_completed ?? 0),
      avaChatFailed: Number(row.ava_chat_failed ?? 0),
    }
  }

  async errorFingerprints24h(limit = 25): Promise<import('../../domain/ops/ops-metrics.types.js').ErrorFingerprintRow[]> {
    const { rows } = await this.pool.query(
      `SELECT
         event_name,
         COALESCE(
           properties->>'error_code',
           properties->>'status',
           properties->>'portal_type',
           'unknown'
         ) AS fingerprint,
         COUNT(*)::int AS count,
         MAX(created_at) AS last_seen_at
       FROM product_events
       WHERE created_at >= NOW() - INTERVAL '24 hours'
         AND event_name IN (
           'ava_chat_failed',
           'sync_job_terminal',
           'ava_quota_blocked',
           'billing_checkout_started',
           'hygiene_resolved'
         )
       GROUP BY event_name, fingerprint
       ORDER BY count DESC
       LIMIT $1`,
      [limit],
    )
    return rows.map((row) => ({
      eventName: row.event_name as string,
      fingerprint: String(row.fingerprint ?? 'unknown'),
      count: Number(row.count),
      lastSeenAt: new Date(row.last_seen_at as string).toISOString(),
    }))
  }

  async productEventUsage24h(): Promise<
    import('../../domain/ops/ops-feature-health.js').ProductEventUsageRow[]
  > {
    const { rows } = await this.pool.query(
      `SELECT
         route,
         event_name,
         COUNT(*)::int AS event_count,
         COUNT(DISTINCT session_id)::int AS session_count
       FROM product_events
       WHERE created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY route, event_name`,
    )
    return rows.map((row) => ({
      route: row.route as string | null,
      eventName: row.event_name as string,
      eventCount: Number(row.event_count),
      sessionCount: Number(row.session_count),
    }))
  }

  async clientErrorFeatureCounts24h(): Promise<
    import('../../domain/ops/ops-feature-health.js').ClientErrorFeatureCountRow[]
  > {
    const { rows } = await this.pool.query(
      `SELECT
         feature,
         COUNT(*)::int AS error_count,
         COUNT(DISTINCT account_id)::int AS account_count
       FROM client_errors
       WHERE created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY feature`,
    )
    return rows.map((row) => ({
      feature: row.feature as string,
      errorCount: Number(row.error_count),
      accountCount: Number(row.account_count),
    }))
  }

  async syncJobsHourly24h(): Promise<Array<{ hour: Date; success: number; failed: number }>> {
    const { rows } = await this.pool.query(
      `SELECT
         date_trunc('hour', COALESCE(finished_at, started_at)) AS hour,
         COUNT(*) FILTER (WHERE status = 'success')::int AS success,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
       FROM sync_jobs
       WHERE status IN ('success', 'failed')
         AND COALESCE(finished_at, started_at) >= NOW() - INTERVAL '24 hours'
       GROUP BY 1
       ORDER BY 1`,
    )
    return rows.map((row) => ({
      hour: new Date(row.hour as string),
      success: Number(row.success),
      failed: Number(row.failed),
    }))
  }

  async avaEventsHourly24h(): Promise<
    Array<{ hour: Date; completed: number; failed: number; quotaBlocked: number }>
  > {
    const { rows } = await this.pool.query(
      `SELECT
         date_trunc('hour', created_at) AS hour,
         COUNT(*) FILTER (WHERE event_name = 'ava_chat_completed')::int AS completed,
         COUNT(*) FILTER (WHERE event_name = 'ava_chat_failed')::int AS failed,
         COUNT(*) FILTER (WHERE event_name = 'ava_quota_blocked')::int AS quota_blocked
       FROM product_events
       WHERE created_at >= NOW() - INTERVAL '24 hours'
         AND event_name IN ('ava_chat_completed', 'ava_chat_failed', 'ava_quota_blocked')
       GROUP BY 1
       ORDER BY 1`,
    )
    return rows.map((row) => ({
      hour: new Date(row.hour as string),
      completed: Number(row.completed),
      failed: Number(row.failed),
      quotaBlocked: Number(row.quota_blocked),
    }))
  }

  async clientErrorsHourly24h(): Promise<Array<{ hour: Date; count: number }>> {
    const { rows } = await this.pool.query(
      `SELECT
         date_trunc('hour', created_at) AS hour,
         COUNT(*)::int AS count
       FROM client_errors
       WHERE created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY 1
       ORDER BY 1`,
    )
    return rows.map((row) => ({
      hour: new Date(row.hour as string),
      count: Number(row.count),
    }))
  }

  async avaTokensHourly24h(): Promise<Array<{ hour: Date; turns: number; tokens: number }>> {
    const { rows } = await this.pool.query(
      `SELECT
         date_trunc('hour', created_at) AS hour,
         COUNT(*)::int AS turns,
         COALESCE(SUM(tokens_total), 0)::bigint AS tokens
       FROM llm_usage_events
       WHERE feature = 'ava_chat'
         AND created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY 1
       ORDER BY 1`,
    )
    return rows.map((row) => ({
      hour: new Date(row.hour as string),
      turns: Number(row.turns),
      tokens: Number(row.tokens),
    }))
  }

  async clientErrorFingerprints24h(
    limit = 30,
  ): Promise<import('../../domain/ops/ops-metrics.types.js').ClientErrorFingerprintRow[]> {
    const { rows } = await this.pool.query(
      `SELECT
         fingerprint,
         feature,
         error_kind,
         error_code,
         COUNT(*)::int AS count,
         COUNT(DISTINCT account_id)::int AS account_count,
         MAX(created_at) AS last_seen_at
       FROM client_errors
       WHERE created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY fingerprint, feature, error_kind, error_code
       ORDER BY count DESC
       LIMIT $1`,
      [limit],
    )
    return rows.map((row) => ({
      fingerprint: row.fingerprint as string,
      feature: row.feature as string,
      errorKind: row.error_kind as string,
      errorCode: row.error_code as string,
      count: Number(row.count),
      accountCount: Number(row.account_count),
      lastSeenAt: new Date(row.last_seen_at as string).toISOString(),
    }))
  }

  async opsWorkerLastTickAt(): Promise<string | null> {
    const { rows } = await this.pool.query(
      `SELECT MAX(created_at) AS last_at
       FROM product_events
       WHERE event_name = 'ops_worker_tick'`,
    )
    const raw = rows[0]?.last_at
    if (!raw) return null
    return new Date(raw as string).toISOString()
  }

  async stripeWebhookRejectedCount1h(): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS count
       FROM product_events
       WHERE event_name = 'stripe_webhook_rejected'
         AND created_at >= NOW() - INTERVAL '1 hour'`,
    )
    return Number(rows[0]?.count ?? 0)
  }
}
