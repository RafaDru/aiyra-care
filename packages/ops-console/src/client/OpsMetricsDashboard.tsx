import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { opsApi } from './api.js'
import { Tabs } from 'antd'
import type { OpsMetricsResponse, RuntimeDegradedView } from './ops.types.js'
import {
  AvaPanel,
  CostPanel,
  countHotFeatures,
  countInfraIssues,
  InfraPanel,
  OverviewPanel,
  ProductPanel,
  SyncPanel,
} from './ops-panels.js'
import { SupportPanel } from './SupportPanel.js'
import { BusinessPanel } from './BusinessPanel.js'
import { IssuesPanel } from './IssuesPanel.js'
import { ProdutoLifecyclePanel } from './ProdutoLifecyclePanel.js'
import {
  readStoredStrategySection,
  readStrategySectionFromUrl,
  StrategyPanel,
} from './StrategyPanel.js'
import { OpsDrillDownProvider } from './ops-drill-down.js'
import { OpsTabObjective } from './components/OpsTabObjective.js'
import type { StrategySectionId } from './ops.types.js'

const TAB_STORAGE_KEY = 'ops-console-active-tab'
const GROUP_STORAGE_KEY = 'ops-console-active-group'

type TabKey =
  | 'overview'
  | 'business'
  | 'strategy'
  | 'issues'
  | 'produto'
  | 'product'
  | 'support'
  | 'sync'
  | 'ava'
  | 'infra'
  | 'cost'

type GroupKey = 'produto' | 'analytics' | 'ops'

const TAB_KEYS: TabKey[] = [
  'overview', 'business', 'strategy', 'issues', 'produto', 'product', 'support', 'sync', 'ava', 'infra', 'cost',
]

const GROUP_TABS: Record<GroupKey, TabKey[]> = {
  produto: ['produto', 'product', 'strategy'],
  analytics: ['business', 'cost'],
  ops: ['overview', 'issues', 'support', 'sync', 'ava', 'infra'],
}

const TAB_OBJECTIVES: Record<TabKey, string> = {
  produto:
    'Roadmap e feature cards — priorize o que está in_progress e abra o card para comportamento e QA.',
  product:
    'Radar de erros automáticos (client_errors) e saúde por feature — não é a fila de investigação.',
  strategy:
    'Financeiro, marketing e CX (advisory round 1) — alinhar narrativa e metas sem PHI.',
  business:
    'KPIs de adoção, engajamento, Ava e receita Stripe — números para decisão de produto.',
  cost:
    'Orçamento LLM interno (R$) — evitar estouro de custo de inferência em dev/preview.',
  overview:
    'Pulse 24h: alertas ativos e dependências — acione «Verificar e acionar» se algo crítico.',
  issues:
    'Pilha de investigações com agente (suporte dev + alertas SRE) — não lista todo erro do app.',
  support:
    'Inbox humana de reportes — triagem antes ou em paralelo à investigação automática.',
  sync:
    'Jobs de integração presos ou falhando — priorize Connect e carteira.',
  ava:
    'Operação do companion: falhas de chat, quota e tokens — separado de analytics de negócio.',
  infra:
    'Probe API/Postgres/Neo4j e controle de stack local.',
}

const TAB_LABELS: Record<TabKey, string> = {
  overview: 'Visão geral',
  business: 'Negócio',
  strategy: 'Financeiro & Marketing',
  issues: 'Investigações',
  produto: 'Ciclo de vida',
  product: 'Produto & UX',
  support: 'Suporte',
  sync: 'Sync',
  ava: 'Ava & LLM',
  infra: 'Infra',
  cost: 'Custo interno',
}

function isTabKey(value: string | null): value is TabKey {
  return value != null && TAB_KEYS.includes(value as TabKey)
}

function tabToGroup(tab: TabKey): GroupKey {
  for (const group of Object.keys(GROUP_TABS) as GroupKey[]) {
    if (GROUP_TABS[group].includes(tab)) return group
  }
  return 'ops'
}

function resolveInitialStrategySection(): StrategySectionId {
  return readStrategySectionFromUrl() ?? readStoredStrategySection() ?? 'mkt'
}

function TabLabel({ text, count, alert }: { text: string; count?: number; alert?: boolean }) {
  return (
    <span className="ops-tab-label">
      {text}
      {count != null && count > 0 && (
        <span className={`ops-tab-count${alert ? ' ops-tab-count--alert' : ''}`}>{count}</span>
      )}
    </span>
  )
}

function TabPanelWrap({ tab, children }: { tab: TabKey; children: ReactNode }) {
  return (
    <div className="ops-tab-panel">
      <OpsTabObjective>{TAB_OBJECTIVES[tab]}</OpsTabObjective>
      {children}
    </div>
  )
}

export function OpsMetricsDashboard({
  data,
  runtime,
  stackSlot,
  onRefresh,
}: {
  data: OpsMetricsResponse
  runtime?: RuntimeDegradedView
  stackSlot?: ReactNode
  onRefresh?: () => void
}) {
  const metrics = data.metrics
  const [issueAttention, setIssueAttention] = useState(0)
  const highlightInvestigationId = useMemo(
    () => new URLSearchParams(window.location.search).get('investigationId'),
    [],
  )

  const [strategySection, setStrategySection] = useState<StrategySectionId>(resolveInitialStrategySection)

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('tab')
    if (isTabKey(fromUrl)) return fromUrl
    const saved = localStorage.getItem(TAB_STORAGE_KEY)
    if (isTabKey(saved)) return saved
    return 'overview'
  })

  const [activeGroup, setActiveGroup] = useState<GroupKey>(() => {
    const params = new URLSearchParams(window.location.search)
    const fromUrlGroup = params.get('group') as GroupKey | null
    if (fromUrlGroup && GROUP_TABS[fromUrlGroup]) return fromUrlGroup
    const saved = localStorage.getItem(GROUP_STORAGE_KEY) as GroupKey | null
    if (saved && GROUP_TABS[saved]) return saved
    const tabFromUrl = params.get('tab')
    const tab = isTabKey(tabFromUrl)
      ? tabFromUrl
      : isTabKey(localStorage.getItem(TAB_STORAGE_KEY))
        ? (localStorage.getItem(TAB_STORAGE_KEY) as TabKey)
        : 'overview'
    return tabToGroup(tab)
  })

  useEffect(() => {
    void opsApi.analysisAttentionCounts().then((c) => {
      setIssueAttention(c.totalAttention)
    }).catch(() => undefined)
  }, [data])

  useEffect(() => {
    if (highlightInvestigationId) {
      setActiveTab('issues')
      setActiveGroup('ops')
    }
  }, [highlightInvestigationId])

  const badges = useMemo(() => ({
    overview: data.alerts.filter((a) => a.severity === 'critical').length,
    product: countHotFeatures(metrics),
    support: metrics.supportReports?.openCount ?? 0,
    sync: metrics.sync.stuckJobs.length,
    ava: metrics.productEvents.last5m.avaChatFailed,
    infra: countInfraIssues(metrics),
    cost: metrics.internalLlm?.exhausted ? 1 : metrics.internalLlm?.budgetExhausted ?? 0,
    issues: issueAttention,
  }), [data.alerts, metrics, issueAttention])

  const groupBadge = useMemo(() => ({
    produto: 0,
    analytics: badges.cost > 0 ? 1 : 0,
    ops:
      badges.overview +
      badges.support +
      badges.sync +
      badges.ava +
      badges.infra +
      badges.issues,
  }), [badges])

  const syncUrl = (tab: TabKey, group: GroupKey, strategy?: StrategySectionId) => {
    const params = new URLSearchParams(window.location.search)
    params.set('tab', tab)
    params.set('group', group)
    if (tab === 'strategy') {
      params.set('strategy', strategy ?? strategySection)
    } else {
      params.delete('strategy')
    }
    const qs = params.toString()
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', next)
  }

  const onLeafTabChange = (key: string) => {
    const tab = key as TabKey
    const group = tabToGroup(tab)
    setActiveTab(tab)
    setActiveGroup(group)
    localStorage.setItem(TAB_STORAGE_KEY, tab)
    localStorage.setItem(GROUP_STORAGE_KEY, group)
    syncUrl(tab, group)
  }

  const onGroupChange = (key: string) => {
    const group = key as GroupKey
    const tabs = GROUP_TABS[group]
    const nextTab = tabs.includes(activeTab) ? activeTab : tabs[0]
    setActiveGroup(group)
    setActiveTab(nextTab)
    localStorage.setItem(GROUP_STORAGE_KEY, group)
    localStorage.setItem(TAB_STORAGE_KEY, nextTab)
    syncUrl(nextTab, group)
  }

  const onStrategySectionChange = (section: StrategySectionId) => {
    setStrategySection(section)
    syncUrl('strategy', 'produto', section)
  }

  const leafItems: Record<TabKey, { key: TabKey; label: ReactNode; children: ReactNode }> = {
    overview: {
      key: 'overview',
      label: <TabLabel text={TAB_LABELS.overview} count={badges.overview} alert />,
      children: (
        <TabPanelWrap tab="overview">
          <OverviewPanel data={data} onRefresh={onRefresh} />
        </TabPanelWrap>
      ),
    },
    business: {
      key: 'business',
      label: <TabLabel text={TAB_LABELS.business} />,
      children: (
        <TabPanelWrap tab="business">
          <BusinessPanel data={data} />
        </TabPanelWrap>
      ),
    },
    strategy: {
      key: 'strategy',
      label: <TabLabel text={TAB_LABELS.strategy} />,
      children: (
        <TabPanelWrap tab="strategy">
          <StrategyPanel section={strategySection} onSectionChange={onStrategySectionChange} prominent />
        </TabPanelWrap>
      ),
    },
    issues: {
      key: 'issues',
      label: <TabLabel text={TAB_LABELS.issues} count={badges.issues} alert={badges.issues > 0} />,
      children: (
        <TabPanelWrap tab="issues">
          <IssuesPanel
            onRefresh={onRefresh}
            highlightInvestigationId={highlightInvestigationId}
            onNavigateTab={(tab) => onLeafTabChange(tab)}
          />
        </TabPanelWrap>
      ),
    },
    produto: {
      key: 'produto',
      label: <TabLabel text={TAB_LABELS.produto} />,
      children: (
        <TabPanelWrap tab="produto">
          <ProdutoLifecyclePanel />
        </TabPanelWrap>
      ),
    },
    product: {
      key: 'product',
      label: <TabLabel text={TAB_LABELS.product} count={badges.product} alert={badges.product > 0} />,
      children: (
        <TabPanelWrap tab="product">
          <ProductPanel data={data} />
        </TabPanelWrap>
      ),
    },
    support: {
      key: 'support',
      label: <TabLabel text={TAB_LABELS.support} count={badges.support} alert={badges.support > 0} />,
      children: (
        <TabPanelWrap tab="support">
          <SupportPanel
            openCount={metrics.supportReports?.openCount ?? 0}
            submitted24h={metrics.supportReports?.submitted24h ?? 0}
            submittedSparkline={metrics.timeSeries24h.supportReportsSubmitted?.map((r) => r.count)}
            onQueueChange={onRefresh}
          />
        </TabPanelWrap>
      ),
    },
    sync: {
      key: 'sync',
      label: <TabLabel text={TAB_LABELS.sync} count={badges.sync} alert={badges.sync > 0} />,
      children: (
        <TabPanelWrap tab="sync">
          <SyncPanel data={data} />
        </TabPanelWrap>
      ),
    },
    ava: {
      key: 'ava',
      label: <TabLabel text={TAB_LABELS.ava} count={badges.ava} alert={badges.ava > 0} />,
      children: (
        <TabPanelWrap tab="ava">
          <AvaPanel data={data} />
        </TabPanelWrap>
      ),
    },
    infra: {
      key: 'infra',
      label: <TabLabel text={TAB_LABELS.infra} count={badges.infra} alert={badges.infra > 0} />,
      children: (
        <TabPanelWrap tab="infra">
          <InfraPanel data={data} runtime={runtime} stackSlot={stackSlot} onRefresh={onRefresh} />
        </TabPanelWrap>
      ),
    },
    cost: {
      key: 'cost',
      label: <TabLabel text={TAB_LABELS.cost} count={badges.cost} alert={badges.cost > 0} />,
      children: (
        <TabPanelWrap tab="cost">
          <CostPanel data={data} />
        </TabPanelWrap>
      ),
    },
  }

  const groupItems = (['produto', 'analytics', 'ops'] as GroupKey[]).map((group) => ({
    key: group,
    label: (
      <TabLabel
        text={group === 'produto' ? 'Produto' : group === 'analytics' ? 'Analytics' : 'Ops'}
        count={groupBadge[group]}
        alert={group === 'ops' && groupBadge.ops > 0}
      />
    ),
    children: (
      <div className="ops-l2-tabs">
        <Tabs
          activeKey={activeTab}
          onChange={onLeafTabChange}
          items={GROUP_TABS[group].map((tab) => leafItems[tab])}
          destroyOnHidden={false}
          size="small"
        />
      </div>
    ),
  }))

  return (
    <OpsDrillDownProvider data={data}>
      <div className="ops-tabs-card ops-l1-tabs">
        <Tabs
          activeKey={activeGroup}
          onChange={onGroupChange}
          items={groupItems}
          destroyOnHidden={false}
          size="middle"
        />
      </div>
    </OpsDrillDownProvider>
  )
}
