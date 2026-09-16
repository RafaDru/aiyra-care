import type { OpsBusinessAnalytics } from './ops-metrics.types.js'

function pct(part: number, total: number): string {
  if (total <= 0) return '—'
  return `${Math.round((part / total) * 1000) / 10}%`
}

function formatBrl(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function buildBusinessWeeklyReportMarkdown(
  business: OpsBusinessAnalytics,
  generatedAt: string,
): string {
  const { totals, activation, engagement, support, billing, integrationHealth7d, ava } = business
  const lines: string[] = [
    '# AiyraCare — relatório semanal de negócio',
    '',
    `> Gerado em ${generatedAt} · agregados sem PHI`,
    '',
    '## Ativação',
    '',
    `| Métrica | Valor |`,
    `|---------|------:|`,
    `| Contas | ${activation.totalAccounts} |`,
    `| Com paciente | ${activation.accountsWithPatient} (${pct(activation.accountsWithPatient, activation.totalAccounts)}) |`,
    `| Com link convênio | ${activation.accountsWithIntegrationLink} (${pct(activation.accountsWithIntegrationLink, activation.totalAccounts)}) |`,
    `| Sync OK 7d | ${activation.accountsWithSyncSuccess7d} (${pct(activation.accountsWithSyncSuccess7d, activation.totalAccounts)}) |`,
    `| Onboarding completo | ${activation.accountsOnboardingComplete} (${pct(activation.accountsOnboardingComplete, activation.totalAccounts)}) |`,
    '',
    '## Crescimento (30d)',
    '',
    `- Novas contas: **${totals.newAccounts30d}**`,
    `- Novos pacientes: **${totals.newPatients30d}**`,
    `- Novas famílias: **${totals.newFamilies30d}**`,
    `- Pacientes totais: **${totals.patients}**`,
    '',
    '## Engajamento',
    '',
    `- WAU: **${engagement.wau}** · MAU: **${engagement.mau}** · WAU/MAU: **${engagement.wauOverMauPct ?? '—'}%**`,
    `- Contas inativas 30d: **${engagement.dormantAccounts30d}**`,
    '',
    '## Ava (30d)',
    '',
    `- Turnos iniciados: **${ava.started30d}** · concluídos: **${ava.completed30d}** · taxa sucesso: **${ava.successRatePct ?? '—'}%**`,
    `- Falhas: **${ava.failed30d}** · quota bloqueada: **${ava.quotaBlocked30d}**`,
    '',
    '## Suporte (7d / backlog)',
    '',
    `- Abertos: **${support.openCount}** · triados: **${support.triagedCount}** · resolvidos 7d: **${support.resolved7d}**`,
    `- Tempo médio resolução 7d: **${support.avgHoursToResolve7d ?? '—'}h**`,
    `- Análise pendente: **${support.analysisPending}** · concluída: **${support.analysisCompleted}**`,
    '',
    '## Billing (30d)',
    '',
    `- Checkout iniciado: **${billing.checkoutStarted30d}** · concluído: **${billing.checkoutCompleted30d}** (${pct(billing.checkoutCompleted30d, billing.checkoutStarted30d)})`,
    `- Planos pagos ativos: **${billing.paidPlans}**`,
    `- Compras concluídas: **${billing.purchasesCompleted30d}** · receita: **${formatBrl(billing.revenueBrlCents30d)}**`,
    '',
    '## Integrações (7d)',
    '',
  ]

  if (integrationHealth7d.length === 0) {
    lines.push('_Sem jobs de sync na janela._', '')
  } else {
    lines.push('| Portal | Jobs | OK | Falha % | Links |', '|--------|-----:|---:|--------:|------:|')
    for (const row of integrationHealth7d) {
      lines.push(
        `| ${row.portalType} | ${row.total7d} | ${row.success7d} | ${row.failRatePct}% | ${row.distinctLinks} |`,
      )
    }
    lines.push('')
  }

  if (support.byCategory30d.length > 0) {
    lines.push('## Suporte por categoria (30d)', '')
    for (const row of support.byCategory30d) {
      lines.push(`- ${row.category}: ${row.count}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
