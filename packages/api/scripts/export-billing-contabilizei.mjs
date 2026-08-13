/**
 * Exporta billing para conciliação Contabilizei / NFS-e.
 * Uso: node packages/api/scripts/export-billing-contabilizei.mjs [YYYY-MM]
 */
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const monthArg = process.argv[2]
const now = new Date()
const year = monthArg ? Number(monthArg.slice(0, 4)) : now.getFullYear()
const month = monthArg ? Number(monthArg.slice(5, 7)) : now.getMonth() + 1
const start = new Date(year, month - 1, 1)
const end = new Date(year, month, 1)
const label = `${year}-${String(month).padStart(2, '0')}`

const familyMonthlyCents = (() => {
  const n = Number(process.env.BILLING_FAMILY_MONTHLY_CENTS ?? 1990)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1990
})()

function csvCell(value) {
  const s = value == null ? '' : String(value)
  return `"${s.replace(/"/g, '""')}"`
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const { rows: purchases } = await pool.query(
  `SELECT bp.completed_at, bp.package_credits, bp.amount_cents, bp.currency,
          bp.stripe_session_id, bp.stripe_payment_intent_id,
          aa.email AS account_email, ap.full_name AS account_full_name
   FROM billing_purchases bp
   JOIN app_accounts aa ON aa.id = bp.account_id
   LEFT JOIN account_profiles ap ON ap.account_id = bp.account_id
   WHERE bp.status = 'completed'
     AND bp.completed_at >= $1 AND bp.completed_at < $2
   ORDER BY bp.completed_at`,
  [start, end],
)

const { rows: subs } = await pool.query(
  `SELECT ae.stripe_subscription_id, aa.email AS account_email, ap.full_name AS account_full_name
   FROM account_entitlements ae
   JOIN app_accounts aa ON aa.id = ae.account_id
   LEFT JOIN account_profiles ap ON ap.account_id = ae.account_id
   WHERE ae.plan_tier = 'family'
     AND ae.subscription_status IN ('active', 'trialing', 'past_due')`,
)

const header = [
  'kind',
  'completed_at',
  'account_email',
  'account_full_name',
  'amount_brl',
  'description',
  'package_credits',
  'currency',
  'stripe_session_id',
  'stripe_payment_intent_id',
  'stripe_subscription_id',
].join(',')

const packageLines = purchases.map((r) => {
  const credits = Number(r.package_credits)
  return [
    csvCell('package'),
    csvCell(r.completed_at ? new Date(r.completed_at).toISOString() : ''),
    csvCell(r.account_email ?? ''),
    csvCell(r.account_full_name),
    csvCell((Number(r.amount_cents) / 100).toFixed(2)),
    csvCell(`Pacote ${credits} interpretações manuscrito`),
    csvCell(credits),
    csvCell(r.currency),
    csvCell(r.stripe_session_id),
    csvCell(r.stripe_payment_intent_id),
    csvCell(''),
  ].join(',')
})

const refAmount = (familyMonthlyCents / 100).toFixed(2)
const refDate = start.toISOString()
const subLines = subs.map((r) => [
  csvCell('subscription_reference'),
  csvCell(refDate),
  csvCell(r.account_email ?? ''),
  csvCell(r.account_full_name),
  csvCell(refAmount),
  csvCell('Assinatura AiyraCare plano família (valor referência — conferir Stripe)'),
  csvCell(''),
  csvCell('brl'),
  csvCell(''),
  csvCell(''),
  csvCell(r.stripe_subscription_id),
].join(','))

const outPath = resolve(root, `billing-export-${label}.csv`)
writeFileSync(outPath, [header, ...packageLines, ...subLines].join('\n'), 'utf8')
console.log(`Exported ${packageLines.length} packages + ${subLines.length} subscription refs → ${outPath}`)
await pool.end()
