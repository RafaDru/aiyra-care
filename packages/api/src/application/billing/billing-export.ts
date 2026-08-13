export interface BillingExportRow {
  kind: 'package' | 'subscription_reference'
  completedAt: string
  accountEmail: string
  accountFullName: string | null
  amountBrl: string
  description: string
  packageCredits: number | null
  currency: string
  stripeSessionId: string | null
  stripePaymentIntentId: string | null
  stripeSubscriptionId: string | null
}

export function isBillingExportOperator(accountId: string): boolean {
  const raw = process.env.BILLING_EXPORT_ACCOUNT_IDS?.trim()
  if (!raw) return false
  return raw.split(',').map((s) => s.trim()).filter(Boolean).includes(accountId)
}

export function parseBillingExportMonth(monthArg?: string): {
  year: number
  month: number
  start: Date
  end: Date
  label: string
} {
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() + 1
  if (monthArg && /^\d{4}-\d{2}$/.test(monthArg)) {
    year = Number(monthArg.slice(0, 4))
    month = Number(monthArg.slice(5, 7))
  }
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  const label = `${year}-${String(month).padStart(2, '0')}`
  return { year, month, start, end, label }
}

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  return `"${s.replace(/"/g, '""')}"`
}

export function formatBillingExportCsv(rows: BillingExportRow[]): string {
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

  const lines = rows.map((r) => [
    csvCell(r.kind),
    csvCell(r.completedAt),
    csvCell(r.accountEmail),
    csvCell(r.accountFullName),
    csvCell(r.amountBrl),
    csvCell(r.description),
    csvCell(r.packageCredits),
    csvCell(r.currency),
    csvCell(r.stripeSessionId),
    csvCell(r.stripePaymentIntentId),
    csvCell(r.stripeSubscriptionId),
  ].join(','))

  return [header, ...lines].join('\n')
}
