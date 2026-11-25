import { Tooltip, Typography } from 'antd'
import type { OpsUsageLiveSnapshot } from './ops.types.js'
import { OpsKpiCard, OpsKpiGrid } from './components/OpsKpiCard.js'
import { OpsPanel } from './components/OpsPanel.js'

const { Text } = Typography

const SURFACE_LABEL: Record<string, string> = {
  web: 'Web',
  mobile: 'Mobile',
  anon: 'Anônimo (landing)',
}

export function UsageLiveStrip({ live }: { live: OpsUsageLiveSnapshot | undefined }) {
  if (!live) {
    return (
      <OpsPanel title="Uso ao vivo" description="Telemetria indisponível neste ambiente.">
        <Text type="secondary">Sem snapshot de uso — verifique migrações e `product_events`.</Text>
      </OpsPanel>
    )
  }

  const spark = live.eventsPerMinuteLastHour.map((r) => r.count)

  return (
    <OpsPanel
      title="Uso ao vivo"
      description={`Proxy por eventos nos últimos ${live.windowMinutes} min — não é sessão Supabase.`}
    >
      <OpsKpiGrid>
        <Tooltip title="Contas distintas com evento autenticado na janela.">
          <div>
            <OpsKpiCard
              label="Contas ativas (15 min)"
              value={live.activeAccounts}
              hint={`${live.activeSessions} sessões app`}
              sparkline={spark}
            />
          </div>
        </Tooltip>
        <OpsKpiCard
          label="Sessões app"
          value={live.activeSessions}
          hint={`${live.anonymousSessions} anônimas`}
        />
        <OpsKpiCard
          label="Anônimos"
          value={live.anonymousSessions}
          hint="Landing / share sem login"
        />
        {live.bySurface.map((row) => (
          <OpsKpiCard
            key={row.surface}
            label={SURFACE_LABEL[row.surface] ?? row.surface}
            value={row.sessions}
            hint={`${row.accounts} contas`}
          />
        ))}
      </OpsKpiGrid>
    </OpsPanel>
  )
}