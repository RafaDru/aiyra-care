import type { Pool } from 'pg'
import type {
  AvaProviderMixRow,
  AvaTokenPercentiles,
  BizSupportCategoryRow,
  OpsBusinessAnalytics,
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

  async supportReportsOpenCount(): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM support_reports WHERE status = 'open'`,
    )
    return Number(rows[0]?.count ?? 0)
  }

  async supportReportsSubmitted24h(): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS count
       FROM product_events
       WHERE event_name = 'support_report_submitted'
         AND created_at >= NOW() - INTERVAL '24 hours'`,
    )
    return Number(rows[0]?.count ?? 0)
  }

  async businessAnalytics(): Promise<OpsBusinessAnalytics> {
    const [
      totalsRes,
      growthRes,
      activationRes,
      engagementRes,
      featuresRes,
      avaSummaryRes,
      avaFailuresRes,
      avaProposedRes,
      avaDailyRes,
      compositionRes,
      supportRes,
      supportCategoriesRes,
      billingEventsRes,
      billingEntitlementsRes,
      billingPurchasesRes,
      integrationRes,
    ] = await Promise.all([
      this.pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM app_accounts) AS total_accounts,
           (SELECT COUNT(*)::int FROM patients) AS total_patients,
           (SELECT COUNT(*)::int FROM care_circles) AS total_families,
           (SELECT COUNT(DISTINCT account_id)::int FROM care_circle_members) AS family_member_accounts,
           (SELECT COUNT(*)::int FROM app_accounts WHERE created_at >= NOW() - INTERVAL '30 days') AS new_accounts_30d,
           (SELECT COUNT(*)::int FROM patients WHERE created_at >= NOW() - INTERVAL '30 days') AS new_patients_30d,
           (SELECT COUNT(*)::int FROM care_circles WHERE created_at >= NOW() - INTERVAL '30 days') AS new_families_30d`,
      ),
      this.pool.query(
        `WITH days AS (
           SELECT generate_series(
             date_trunc('day', NOW() - INTERVAL '29 days'),
             date_trunc('day', NOW()),
             INTERVAL '1 day'
           )::date AS day
         )
         SELECT
           d.day,
           COALESCE(a.cnt, 0)::int AS new_accounts,
           COALESCE(p.cnt, 0)::int AS new_patients,
           COALESCE(c.cnt, 0)::int AS new_families
         FROM days d
         LEFT JOIN (
           SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS cnt
           FROM app_accounts
           WHERE created_at >= NOW() - INTERVAL '30 days'
           GROUP BY 1
         ) a ON a.day = d.day
         LEFT JOIN (
           SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS cnt
           FROM patients
           WHERE created_at >= NOW() - INTERVAL '30 days'
           GROUP BY 1
         ) p ON p.day = d.day
         LEFT JOIN (
           SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS cnt
           FROM care_circles
           WHERE created_at >= NOW() - INTERVAL '30 days'
           GROUP BY 1
         ) c ON c.day = d.day
         ORDER BY d.day`,
      ),
      this.pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM app_accounts) AS total_accounts,
           (SELECT COUNT(DISTINCT account_id)::int FROM patient_memberships) AS accounts_with_patient,
           (SELECT COUNT(DISTINCT pm.account_id)::int
            FROM integration_links il
            JOIN patient_memberships pm ON pm.patient_id = il.patient_id) AS accounts_with_link,
           (SELECT COUNT(DISTINCT pm.account_id)::int
            FROM sync_jobs sj
            JOIN integration_links il ON il.id = sj.integration_link_id
            JOIN patient_memberships pm ON pm.patient_id = il.patient_id
            WHERE sj.status = 'success'
              AND sj.finished_at >= NOW() - INTERVAL '7 days') AS accounts_sync_success_7d,
           (SELECT COUNT(DISTINCT account_id)::int
            FROM product_events
            WHERE event_name = 'onboarding_step'
              AND properties->>'step' = 'profile_complete') AS accounts_onboarding_complete`,
      ),
      this.pool.query(
        `SELECT
           (SELECT COUNT(DISTINCT account_id)::int
            FROM product_events
            WHERE account_id IS NOT NULL
              AND created_at >= NOW() - INTERVAL '7 days') AS wau,
           (SELECT COUNT(DISTINCT account_id)::int
            FROM product_events
            WHERE account_id IS NOT NULL
              AND created_at >= NOW() - INTERVAL '30 days') AS mau,
           (SELECT COUNT(*)::int
            FROM app_accounts a
            WHERE a.created_at < NOW() - INTERVAL '30 days'
              AND NOT EXISTS (
                SELECT 1 FROM product_events pe
                WHERE pe.account_id = a.id
                  AND pe.created_at >= NOW() - INTERVAL '30 days'
              )) AS dormant_accounts_30d`,
      ),
      this.pool.query(
        `SELECT
           CASE
             WHEN event_name = 'app_screen_viewed' THEN COALESCE(properties->>'feature_key', 'app')
             ELSE event_name
           END AS feature_key,
           COUNT(*)::int AS event_count,
           COUNT(DISTINCT session_id)::int AS session_count,
           COUNT(DISTINCT account_id)::int AS account_count
         FROM product_events
         WHERE created_at >= NOW() - INTERVAL '30 days'
           AND event_name NOT IN ('ops_worker_tick', 'stripe_webhook_rejected')
         GROUP BY 1
         ORDER BY event_count DESC
         LIMIT 25`,
      ),
      this.pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE event_name = 'ava_chat_started')::int AS started_30d,
           COUNT(*) FILTER (WHERE event_name = 'ava_chat_completed')::int AS completed_30d,
           COUNT(*) FILTER (WHERE event_name = 'ava_chat_failed')::int AS failed_30d,
           COUNT(*) FILTER (WHERE event_name = 'ava_quota_blocked')::int AS quota_blocked_30d
         FROM product_events
         WHERE created_at >= NOW() - INTERVAL '30 days'
           AND event_name IN (
             'ava_chat_started',
             'ava_chat_completed',
             'ava_chat_failed',
             'ava_quota_blocked'
           )`,
      ),
      this.pool.query(
        `SELECT
           COALESCE(properties->>'error_code', 'unknown') AS error_code,
           COUNT(*)::int AS count,
           MAX(created_at) AS last_seen_at
         FROM product_events
         WHERE created_at >= NOW() - INTERVAL '30 days'
           AND event_name IN ('ava_chat_failed', 'ava_quota_blocked')
         GROUP BY 1
         ORDER BY count DESC
         LIMIT 20`,
      ),
      this.pool.query(
        `SELECT
           COALESCE(properties->>'action_type', 'unknown') AS action_type,
           COUNT(*)::int AS count,
           COUNT(*) FILTER (WHERE properties->>'status' = 'ok')::int AS ok_count
         FROM product_events
         WHERE created_at >= NOW() - INTERVAL '30 days'
           AND event_name = 'ava_proposed_action_executed'
         GROUP BY 1
         ORDER BY count DESC`,
      ),
      this.pool.query(
        `WITH days AS (
           SELECT generate_series(
             date_trunc('day', NOW() - INTERVAL '29 days'),
             date_trunc('day', NOW()),
             INTERVAL '1 day'
           )::date AS day
         )
         SELECT
           d.day,
           COALESCE(s.started, 0)::int AS started,
           COALESCE(s.completed, 0)::int AS completed,
           COALESCE(s.unresolved, 0)::int AS unresolved
         FROM days d
         LEFT JOIN (
           SELECT
             date_trunc('day', created_at)::date AS day,
             COUNT(*) FILTER (WHERE event_name = 'ava_chat_started')::int AS started,
             COUNT(*) FILTER (WHERE event_name = 'ava_chat_completed')::int AS completed,
             COUNT(*) FILTER (
               WHERE event_name IN ('ava_chat_failed', 'ava_quota_blocked')
             )::int AS unresolved
           FROM product_events
           WHERE created_at >= NOW() - INTERVAL '30 days'
             AND event_name IN (
               'ava_chat_started',
               'ava_chat_completed',
               'ava_chat_failed',
               'ava_quota_blocked'
             )
           GROUP BY 1
         ) s ON s.day = d.day
         ORDER BY d.day`,
      ),
      this.pool.query(
        `SELECT
           domain,
           COUNT(*)::int AS scopes_touched,
           COUNT(DISTINCT patient_id) FILTER (WHERE patient_id IS NOT NULL)::int AS patients_touched
         FROM data_domain_generations
         WHERE generation >= NOW() - INTERVAL '30 days'
         GROUP BY domain
         ORDER BY scopes_touched DESC`,
      ),
      this.pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
           COUNT(*) FILTER (WHERE status = 'triaged')::int AS triaged_count,
           COUNT(*) FILTER (
             WHERE status IN ('resolved', 'closed')
               AND resolved_at >= NOW() - INTERVAL '7 days'
           )::int AS resolved_7d,
           AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0) FILTER (
             WHERE resolved_at IS NOT NULL
               AND resolved_at >= NOW() - INTERVAL '7 days'
           ) AS avg_hours_resolve_7d,
           ROUND(
             100.0 * COUNT(*) FILTER (WHERE consent_technical) / NULLIF(COUNT(*), 0),
             1
           )::float AS consent_technical_pct,
           COUNT(*) FILTER (WHERE analysis_status IN ('pending', 'in_progress'))::int AS analysis_pending,
           COUNT(*) FILTER (WHERE analysis_status = 'completed')::int AS analysis_completed
         FROM support_reports`,
      ),
      this.pool.query(
        `SELECT category, COUNT(*)::int AS count
         FROM support_reports
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY category
         ORDER BY count DESC`,
      ),
      this.pool.query(
        `SELECT
           COUNT(*) FILTER (
             WHERE event_name = 'billing_checkout_started'
               AND created_at >= NOW() - INTERVAL '7 days'
           )::int AS checkout_started_7d,
           COUNT(*) FILTER (
             WHERE event_name = 'billing_checkout_completed'
               AND created_at >= NOW() - INTERVAL '7 days'
           )::int AS checkout_completed_7d,
           COUNT(*) FILTER (
             WHERE event_name = 'billing_checkout_started'
               AND created_at >= NOW() - INTERVAL '30 days'
           )::int AS checkout_started_30d,
           COUNT(*) FILTER (
             WHERE event_name = 'billing_checkout_completed'
               AND created_at >= NOW() - INTERVAL '30 days'
           )::int AS checkout_completed_30d
         FROM product_events
         WHERE event_name IN ('billing_checkout_started', 'billing_checkout_completed')`,
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS paid_plans
         FROM account_entitlements
         WHERE plan_tier <> 'free'`,
      ),
      this.pool.query(
        `SELECT
           COUNT(*)::int AS purchases_completed_30d,
           COALESCE(SUM(amount_cents), 0)::int AS revenue_brl_cents_30d
         FROM billing_purchases
         WHERE status = 'completed'
           AND completed_at >= NOW() - INTERVAL '30 days'`,
      ),
      this.pool.query(
        `SELECT
           portal_type AS portal_type,
           COUNT(*)::int AS total_7d,
           COUNT(*) FILTER (WHERE status = 'success')::int AS success_7d,
           ROUND(
             100.0 * COUNT(*) FILTER (WHERE status = 'failed')
               / NULLIF(COUNT(*) FILTER (WHERE status IN ('success', 'failed')), 0),
             1
           )::float AS fail_rate_pct,
           COUNT(DISTINCT integration_link_id)::int AS distinct_links
         FROM sync_jobs
         WHERE COALESCE(finished_at, started_at) >= NOW() - INTERVAL '7 days'
         GROUP BY portal_type
         ORDER BY total_7d DESC`,
      ),
    ])

    const totals = totalsRes.rows[0] as Record<string, unknown>
    const activation = activationRes.rows[0] as Record<string, unknown>
    const engagement = engagementRes.rows[0] as Record<string, unknown>
    const avaSummary = avaSummaryRes.rows[0] as Record<string, unknown>
    const support = supportRes.rows[0] as Record<string, unknown>
    const billingEvents = billingEventsRes.rows[0] as Record<string, unknown>
    const billingEntitlements = billingEntitlementsRes.rows[0] as Record<string, unknown>
    const billingPurchases = billingPurchasesRes.rows[0] as Record<string, unknown>
    const wau = Number(engagement.wau ?? 0)
    const mau = Number(engagement.mau ?? 0)
    const avaCompleted30d = Number(avaSummary.completed_30d ?? 0)
    const avaFailed30d = Number(avaSummary.failed_30d ?? 0)
    const avaQuota30d = Number(avaSummary.quota_blocked_30d ?? 0)
    const avaUnresolved30d = avaFailed30d + avaQuota30d
    const avaTerminal30d = avaCompleted30d + avaUnresolved30d

    return {
      totals: {
        accounts: Number(totals.total_accounts ?? 0),
        patients: Number(totals.total_patients ?? 0),
        families: Number(totals.total_families ?? 0),
        familyMemberAccounts: Number(totals.family_member_accounts ?? 0),
        newAccounts30d: Number(totals.new_accounts_30d ?? 0),
        newPatients30d: Number(totals.new_patients_30d ?? 0),
        newFamilies30d: Number(totals.new_families_30d ?? 0),
      },
      growthDaily30d: growthRes.rows.map((row) => ({
        day: new Date(row.day as string).toISOString().slice(0, 10),
        newAccounts: Number(row.new_accounts),
        newPatients: Number(row.new_patients),
        newFamilies: Number(row.new_families),
      })),
      activation: {
        totalAccounts: Number(activation.total_accounts ?? 0),
        accountsWithPatient: Number(activation.accounts_with_patient ?? 0),
        accountsWithIntegrationLink: Number(activation.accounts_with_link ?? 0),
        accountsWithSyncSuccess7d: Number(activation.accounts_sync_success_7d ?? 0),
        accountsOnboardingComplete: Number(activation.accounts_onboarding_complete ?? 0),
      },
      engagement: {
        wau,
        mau,
        wauOverMauPct: mau > 0 ? Math.round((wau / mau) * 1000) / 10 : null,
        dormantAccounts30d: Number(engagement.dormant_accounts_30d ?? 0),
      },
      topFeatures30d: featuresRes.rows.map((row) => ({
        featureKey: row.feature_key as string,
        eventCount: Number(row.event_count),
        sessionCount: Number(row.session_count),
        accountCount: Number(row.account_count),
      })),
      ava: {
        started30d: Number(avaSummary.started_30d ?? 0),
        completed30d: avaCompleted30d,
        failed30d: avaFailed30d,
        quotaBlocked30d: avaQuota30d,
        unresolved30d: avaUnresolved30d,
        successRatePct: avaTerminal30d > 0
          ? Math.round((avaCompleted30d / avaTerminal30d) * 1000) / 10
          : null,
        failures: avaFailuresRes.rows.map((row) => ({
          errorCode: row.error_code as string,
          count: Number(row.count),
          lastSeenAt: new Date(row.last_seen_at as string).toISOString(),
        })),
        proposedActions: avaProposedRes.rows.map((row) => ({
          actionType: row.action_type as string,
          count: Number(row.count),
          okCount: Number(row.ok_count),
        })),
        daily30d: avaDailyRes.rows.map((row) => ({
          day: new Date(row.day as string).toISOString().slice(0, 10),
          started: Number(row.started),
          completed: Number(row.completed),
          unresolved: Number(row.unresolved),
        })),
      },
      composition: {
        activeDomains30d: compositionRes.rows.map((row) => ({
          domain: row.domain as string,
          scopesTouched30d: Number(row.scopes_touched),
          patientsTouched30d: Number(row.patients_touched),
        })),
      },
      support: {
        openCount: Number(support.open_count ?? 0),
        triagedCount: Number(support.triaged_count ?? 0),
        resolved7d: Number(support.resolved_7d ?? 0),
        avgHoursToResolve7d: support.avg_hours_resolve_7d != null
          ? Math.round(Number(support.avg_hours_resolve_7d) * 10) / 10
          : null,
        consentTechnicalPct: support.consent_technical_pct != null
          ? Number(support.consent_technical_pct)
          : null,
        analysisPending: Number(support.analysis_pending ?? 0),
        analysisCompleted: Number(support.analysis_completed ?? 0),
        byCategory30d: supportCategoriesRes.rows.map((row) => ({
          category: row.category as string,
          count: Number(row.count),
        })) satisfies BizSupportCategoryRow[],
      },
      billing: {
        checkoutStarted7d: Number(billingEvents.checkout_started_7d ?? 0),
        checkoutCompleted7d: Number(billingEvents.checkout_completed_7d ?? 0),
        checkoutStarted30d: Number(billingEvents.checkout_started_30d ?? 0),
        checkoutCompleted30d: Number(billingEvents.checkout_completed_30d ?? 0),
        paidPlans: Number(billingEntitlements.paid_plans ?? 0),
        purchasesCompleted30d: Number(billingPurchases.purchases_completed_30d ?? 0),
        revenueBrlCents30d: Number(billingPurchases.revenue_brl_cents_30d ?? 0),
      },
      integrationHealth7d: integrationRes.rows.map((row) => ({
        portalType: row.portal_type as string,
        total7d: Number(row.total_7d),
        success7d: Number(row.success_7d),
        failRatePct: Number(row.fail_rate_pct ?? 0),
        distinctLinks: Number(row.distinct_links),
      })),
    }
  }
}
