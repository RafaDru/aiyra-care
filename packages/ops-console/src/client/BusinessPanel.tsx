import { Empty, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type {
  BizCompositionDomainRow,
  BizFeatureUsageRow,
  BizIntegrationPortalRow,
  OpsMetricsResponse,
} from './ops.types.js'
import { OpsPanel } from './components/OpsPanel.js'
import { OpsKpiCard, OpsKpiGrid } from './components/OpsKpiCard.js'
import { BizAvaTurnsTimeline, BizGrowthTimeline } from './components/OpsCharts.js'
import { formatBrl } from './ops-format.js'
import { resolveClientFeatureLabel } from './ops-feature-catalog.js'

const { Text, Title } = Typography

const SUPPORT_CATEGORY_LABEL: Record<string, string> = {
  technical_bug: 'Bug técnico',
  incorrect_data: 'Dado incorreto',
  ux_confusion: 'Confusão UX',
  other: 'Outro',
}

const DOMAIN_LABEL: Record<string, string> = {
  wallet: 'Carteira',
  timeline: 'Linha do tempo',
  exams: 'Exames',
  documents: 'Documentos',
  hygiene: 'Higienização',
}

const AVA_ACTION_LABEL: Record<string, string> = {
  clinical_export: 'Export clínico',
  integration_sync: 'Sync integração',
  hygiene_merge: 'Merge higiene',
  hygiene_dismiss: 'Dispensar higiene',
}

function pct(part: number, total: number): string {
  if (total <= 0) return '—'
  return `${Math.round((part / total) * 1000) / 10}%`
}

function conversionRate(completed: number, started: number): string {
  if (started <= 0) return '—'
  return `${Math.round((completed / started) * 1000) / 10}%`
}

function deltaHint(newCount: number): string {
  if (newCount <= 0) return 'sem novos 30d'
  return `+${newCount} em 30d`
}

function featureLabel(key: string): string {
  if (key.includes('_') && !key.startsWith('api:')) {
    try {
      return resolveClientFeatureLabel(key)
    } catch {
      return key.replace(/_/g, ' ')
    }
  }
  try {
    return resolveClientFeatureLabel(key)
  } catch {
    return key.replace(/_/g, ' ')
  }
}

const integrationColumns: ColumnsType<BizIntegrationPortalRow> = [
  { title: 'Portal', dataIndex: 'portalType', key: 'portalType' },
  { title: 'Jobs 7d', dataIndex: 'total7d', key: 'total7d', width: 90 },
  { title: 'OK', dataIndex: 'success7d', key: 'success7d', width: 70 },
  {
    title: 'Falha %',
    dataIndex: 'failRatePct',
    key: 'failRatePct',
    width: 90,
    render: (value: number) => (
      <Tag color={value >= 20 ? 'error' : value >= 5 ? 'warning' : 'success'}>
        {value}%
      </Tag>
    ),
  },
  { title: 'Links', dataIndex: 'distinctLinks', key: 'distinctLinks', width: 80 },
]

const featureColumns: ColumnsType<BizFeatureUsageRow> = [
  {
    title: 'Feature',
    dataIndex: 'featureKey',
    render: (key: string) => featureLabel(key),
  },
  { title: 'Eventos', dataIndex: 'eventCount', width: 90 },
  { title: 'Sessões', dataIndex: 'sessionCount', width: 90 },
  { title: 'Contas', dataIndex: 'accountCount', width: 80 },
]

const compositionColumns: ColumnsType<BizCompositionDomainRow> = [
  {
    title: 'Domínio de dados',
    dataIndex: 'domain',
    render: (domain: string) => DOMAIN_LABEL[domain] ?? domain,
  },
  { title: 'Escopos ativos', dataIndex: 'scopesTouched30d', width: 120 },
  { title: 'Pacientes', dataIndex: 'patientsTouched30d', width: 100 },
]

export function BusinessPanel({ data }: { data: OpsMetricsResponse }) {
  const business = data.metrics.business
  if (!business) {
    return <Empty description="Métricas de negócio indisponíveis neste ambiente." />
  }

  const {
    totals,
    growthDaily30d,
    activation,
    engagement,
    topFeatures30d,
    ava,
    composition,
    support,
    billing,
    integrationHealth7d,
  } = business

  return (
    <div className="ops-panel-stack">
      <OpsPanel title="Grandes números" description="Totais acumulados — sem PHI.">
        <div className="ops-kpi-grid ops-kpi-grid--hero">
          <OpsKpiCard
            label="Usuários"
            value={totals.accounts}
            hint={deltaHint(totals.newAccounts30d)}
          />
          <OpsKpiCard
            label="Pacientes"
            value={totals.patients}
            hint={deltaHint(totals.newPatients30d)}
          />
          <OpsKpiCard
            label="Famílias"
            value={totals.families}
            hint={deltaHint(totals.newFamilies30d)}
          />
          <OpsKpiCard
            label="Membros em famílias"
            value={totals.familyMemberAccounts}
            hint="contas em círculos"
          />
        </div>
      </OpsPanel>

      <div className="ops-chart-grid">
        <div className="ops-chart-span-12">
          <BizGrowthTimeline rows={growthDaily30d} />
        </div>
      </div>

      <OpsPanel title="Features mais usadas" description="Telas e eventos · últimos 30 dias.">
        {topFeatures30d.length === 0 ? (
          <Empty description="Sem eventos de produto nos últimos 30 dias." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            size="small"
            pagination={false}
            rowKey="featureKey"
            dataSource={topFeatures30d}
            columns={featureColumns}
          />
        )}
      </OpsPanel>

      <OpsPanel
        title="Ava — analytics"
        description="Turnos, taxa de sucesso e o que não foi resolvido (falha ou quota)."
      >
        <OpsKpiGrid>
          <OpsKpiCard label="Turnos iniciados" value={ava.started30d} />
          <OpsKpiCard label="Concluídos" value={ava.completed30d} />
          <OpsKpiCard
            label="Não resolvidos"
            value={ava.unresolved30d}
            alert={ava.unresolved30d > 0}
            hint={`${ava.failed30d} falha · ${ava.quotaBlocked30d} quota`}
          />
          <OpsKpiCard
            label="Taxa sucesso"
            value={ava.successRatePct != null ? `${ava.successRatePct}%` : '—'}
          />
        </OpsKpiGrid>

        <div className="ops-chart-grid" style={{ marginTop: 16 }}>
          <div className="ops-chart-span-12">
            <BizAvaTurnsTimeline rows={ava.daily30d} />
          </div>
        </div>

        {ava.failures.length > 0 && (
          <>
            <Title level={5} style={{ marginTop: 20, marginBottom: 8 }}>
              Motivos de não resolução (30d)
            </Title>
            <Table
              size="small"
              pagination={false}
              rowKey="errorCode"
              dataSource={ava.failures}
              columns={[
                { title: 'Código', dataIndex: 'errorCode' },
                { title: 'Ocorrências', dataIndex: 'count', width: 110 },
                {
                  title: 'Último',
                  dataIndex: 'lastSeenAt',
                  width: 180,
                  render: (v: string) => new Date(v).toLocaleString('pt-BR'),
                },
              ]}
            />
          </>
        )}

        {ava.proposedActions.length > 0 && (
          <>
            <Title level={5} style={{ marginTop: 20, marginBottom: 8 }}>
              Ações propostas executadas
            </Title>
            <Table
              size="small"
              pagination={false}
              rowKey="actionType"
              dataSource={ava.proposedActions}
              columns={[
                {
                  title: 'Ação',
                  dataIndex: 'actionType',
                  render: (t: string) => AVA_ACTION_LABEL[t] ?? t,
                },
                { title: 'Total', dataIndex: 'count', width: 80 },
                { title: 'OK', dataIndex: 'okCount', width: 70 },
              ]}
            />
          </>
        )}
      </OpsPanel>

      <OpsPanel
        title="Composição de dados"
        description="Domínios clínicos atualizados (sync, import, higiene) — últimos 30 dias."
      >
        {composition.activeDomains30d.length === 0 ? (
          <Empty
            description="Nenhum domínio com atualização recente."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            size="small"
            pagination={false}
            rowKey="domain"
            dataSource={composition.activeDomains30d}
            columns={compositionColumns}
          />
        )}
        <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
          Reflete bumps em data_domain_generations — carteira, exames, timeline, etc.
        </Text>
      </OpsPanel>

      <OpsPanel
        title="Ativação"
        description="Funil agregado de adoção."
      >
        <OpsKpiGrid>
          <OpsKpiCard label="Contas" value={activation.totalAccounts} />
          <OpsKpiCard
            label="Com paciente"
            value={activation.accountsWithPatient}
            hint={pct(activation.accountsWithPatient, activation.totalAccounts)}
          />
          <OpsKpiCard
            label="Com convênio"
            value={activation.accountsWithIntegrationLink}
            hint={pct(activation.accountsWithIntegrationLink, activation.totalAccounts)}
          />
          <OpsKpiCard
            label="Sync OK (7d)"
            value={activation.accountsWithSyncSuccess7d}
            hint={pct(activation.accountsWithSyncSuccess7d, activation.totalAccounts)}
          />
          <OpsKpiCard
            label="Onboarding completo"
            value={activation.accountsOnboardingComplete}
            hint={pct(activation.accountsOnboardingComplete, activation.totalAccounts)}
          />
        </OpsKpiGrid>
      </OpsPanel>

      <OpsPanel title="Engajamento" description="WAU/MAU via product_events autenticados.">
        <OpsKpiGrid>
          <OpsKpiCard label="WAU" value={engagement.wau} />
          <OpsKpiCard label="MAU" value={engagement.mau} />
          <OpsKpiCard
            label="WAU/MAU"
            value={engagement.wauOverMauPct != null ? `${engagement.wauOverMauPct}%` : '—'}
          />
          <OpsKpiCard
            label="Inativas 30d+"
            value={engagement.dormantAccounts30d}
            alert={engagement.dormantAccounts30d > 0}
          />
        </OpsKpiGrid>
      </OpsPanel>

      <div className="ops-chart-grid">
        <div className="ops-chart-span-6">
          <OpsPanel title="Suporte" description="Fila + SLA proxy (7d).">
            <OpsKpiGrid>
              <OpsKpiCard label="Abertos" value={support.openCount} alert={support.openCount > 0} />
              <OpsKpiCard label="Triados" value={support.triagedCount} />
              <OpsKpiCard label="Resolvidos 7d" value={support.resolved7d} />
              <OpsKpiCard
                label="Média resolução (h)"
                value={support.avgHoursToResolve7d ?? '—'}
              />
              <OpsKpiCard
                label="Análise pendente"
                value={support.analysisPending}
                alert={support.analysisPending > 0}
              />
              <OpsKpiCard label="Análises concluídas" value={support.analysisCompleted} />
            </OpsKpiGrid>
            {support.consentTechnicalPct != null && (
              <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                Consentimento técnico: {support.consentTechnicalPct}% dos tickets
              </Text>
            )}
            {support.byCategory30d.length > 0 && (
              <Table
                size="small"
                style={{ marginTop: 16 }}
                pagination={false}
                rowKey="category"
                dataSource={support.byCategory30d}
                columns={[
                  {
                    title: 'Categoria (30d)',
                    dataIndex: 'category',
                    render: (value: string) => SUPPORT_CATEGORY_LABEL[value] ?? value,
                  },
                  { title: 'Volume', dataIndex: 'count', width: 90 },
                ]}
              />
            )}
          </OpsPanel>
        </div>

        <div className="ops-chart-span-6">
          <OpsPanel title="Billing" description="Eventos + compras Stripe (agregado).">
            <OpsKpiGrid>
              <OpsKpiCard label="Planos pagos" value={billing.paidPlans} />
              <OpsKpiCard label="Checkout 7d" value={billing.checkoutStarted7d} />
              <OpsKpiCard
                label="Conversão 7d"
                value={conversionRate(billing.checkoutCompleted7d, billing.checkoutStarted7d)}
              />
              <OpsKpiCard label="Compras 30d" value={billing.purchasesCompleted30d} />
              <OpsKpiCard
                label="Receita 30d"
                value={formatBrl(billing.revenueBrlCents30d)}
              />
            </OpsKpiGrid>
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              30d: {billing.checkoutCompleted30d}/{billing.checkoutStarted30d} checkouts (
              {conversionRate(billing.checkoutCompleted30d, billing.checkoutStarted30d)})
            </Text>
          </OpsPanel>
        </div>
      </div>

      <OpsPanel
        title="Integrações (7d)"
        description="Saúde por portal — input para priorização Connect vs suporte."
      >
        {integrationHealth7d.length === 0 ? (
          <Empty description="Sem jobs de sync nos últimos 7 dias." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            size="small"
            pagination={false}
            rowKey="portalType"
            dataSource={integrationHealth7d}
            columns={integrationColumns}
          />
        )}
      </OpsPanel>
    </div>
  )
}
