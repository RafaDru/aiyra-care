import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { opsApi } from './api.js'
import { Segmented, Tabs, Typography } from 'antd'

const { Text } = Typography
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
import { MobilePanel } from './MobilePanel.js'
import {
  readStoredStrategySection,
  readStrategySectionFromUrl,
  StrategyPanel,
} from './StrategyPanel.js'
import { OpsDrillDownProvider } from './ops-drill-down.js'
import type { StrategySectionId } from './ops.types.js'
import {
  CONTEXT_STORAGE_KEY,
  contextForTab,
  isContextId,
  isTabKey,
  OPS_CONTEXTS,
  TAB_META,
  TAB_STORAGE_KEY,
  tabsForContext,
  type OpsContextId,
  type TabKey,
} from './ops-tab-navigation.js'

function resolveInitialStrategySection(): StrategySectionId {
  return readStrategySectionFromUrl() ?? readStoredStrategySection() ?? 'cx'
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

  const [activeContext, setActiveContext] = useState<OpsContextId>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('context')
    if (isContextId(fromUrl)) return fromUrl
    const saved = localStorage.getItem(CONTEXT_STORAGE_KEY)
    if (isContextId(saved)) return saved
    return contextForTab(activeTab)
  })

  useEffect(() => {
    void opsApi.analysisAttentionCounts().then((c) => {
      setIssueAttention(c.totalAttention)
    }).catch(() => undefined)
  }, [data])

  useEffect(() => {
    if (highlightInvestigationId) {
      setActiveContext('operation')
      setActiveTab('issues')
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

  const syncUrl = (tab: TabKey, context: OpsContextId, strategy?: StrategySectionId) => {
    const params = new URLSearchParams(window.location.search)
    params.set('tab', tab)
    params.set('context', context)
    const strategyTab = TAB_META[tab].strategySection
    if (strategyTab) {
      params.set('strategy', strategy ?? strategyTab)
    } else {
      params.delete('strategy')
    }
    const qs = params.toString()
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', next)
  }

  const onContextChange = (value: string | number) => {
    const ctx = value as OpsContextId
    setActiveContext(ctx)
    localStorage.setItem(CONTEXT_STORAGE_KEY, ctx)
    const tabs = tabsForContext(ctx)
    const nextTab = tabs.includes(activeTab) ? activeTab : tabs[0]
    setActiveTab(nextTab)
    localStorage.setItem(TAB_STORAGE_KEY, nextTab)
    syncUrl(nextTab, ctx)
  }

  const onTabChange = (key: string) => {
    const tab = key as TabKey
    const ctx = contextForTab(tab)
    setActiveTab(tab)
    setActiveContext(ctx)
    localStorage.setItem(TAB_STORAGE_KEY, tab)
    localStorage.setItem(CONTEXT_STORAGE_KEY, ctx)
    const section = TAB_META[tab].strategySection
    if (section) setStrategySection(section)
    syncUrl(tab, ctx, section ?? strategySection)
  }

  const onStrategySectionChange = (section: StrategySectionId) => {
    setStrategySection(section)
    syncUrl(activeTab, activeContext, section)
  }

  const sectionForTab = (tab: TabKey): StrategySectionId =>
    TAB_META[tab].strategySection ?? strategySection

  const renderStrategyForTab = (tab: TabKey) => {
    const section = sectionForTab(tab)
    return (
      <StrategyPanel
        section={section}
        onSectionChange={onStrategySectionChange}
        hideSectionTabs={Boolean(TAB_META[tab].strategySection)}
      />
    )
  }

  const tabChildren: Record<TabKey, ReactNode> = {
    overview: <OverviewPanel data={data} onRefresh={onRefresh} />,
    business: <BusinessPanel data={data} />,
    strategy: renderStrategyForTab('strategy'),
    marketing: renderStrategyForTab('marketing'),
    finance: renderStrategyForTab('finance'),
    issues: (
      <IssuesPanel
        onRefresh={onRefresh}
        highlightInvestigationId={highlightInvestigationId}
      />
    ),
    produto: <ProdutoLifecyclePanel />,
    product: <ProductPanel data={data} />,
    mobile: <MobilePanel data={data} />,
    support: (
      <SupportPanel
        openCount={metrics.supportReports?.openCount ?? 0}
        submitted24h={metrics.supportReports?.submitted24h ?? 0}
        submittedSparkline={metrics.timeSeries24h.supportReportsSubmitted?.map((r) => r.count)}
        onQueueChange={onRefresh}
      />
    ),
    sync: <SyncPanel data={data} />,
    ava: <AvaPanel data={data} />,
    infra: (
      <InfraPanel data={data} runtime={runtime} stackSlot={stackSlot} onRefresh={onRefresh} />
    ),
    cost: <CostPanel data={data} />,
  }

  const badgeForTab = (key: TabKey): { count?: number; alert?: boolean } => {
    switch (key) {
      case 'overview':
        return { count: badges.overview, alert: true }
      case 'product':
        return { count: badges.product, alert: badges.product > 0 }
      case 'issues':
        return { count: badges.issues, alert: badges.issues > 0 }
      case 'support':
        return { count: badges.support, alert: badges.support > 0 }
      case 'sync':
        return { count: badges.sync, alert: badges.sync > 0 }
      case 'ava':
        return { count: badges.ava, alert: badges.ava > 0 }
      case 'infra':
        return { count: badges.infra, alert: badges.infra > 0 }
      case 'cost':
        return { count: badges.cost, alert: badges.cost > 0 }
      default:
        return {}
    }
  }

  const visibleTabs = tabsForContext(activeContext)
  const contextMeta = OPS_CONTEXTS.find((c) => c.id === activeContext)

  const items = visibleTabs.map((key) => {
    const { count, alert } = badgeForTab(key)
    return {
      key,
      label: <TabLabel text={TAB_META[key].label} count={count} alert={alert} />,
      children: (
        <div className={`ops-tab-panel ops-tab-panel--${activeContext}`}>
          {tabChildren[key]}
        </div>
      ),
    }
  })

  return (
    <OpsDrillDownProvider data={data}>
      <div className="ops-tabs-card">
        <div className={`ops-context-bar ops-context-bar--${activeContext}`}>
          <Segmented
            className="ops-context-segmented"
            value={activeContext}
            onChange={onContextChange}
            options={OPS_CONTEXTS.map((c) => ({
              label: (
                <span className="ops-context-option">
                  <span className="ops-context-option-label">{c.label}</span>
                  <span className="ops-context-option-hint">{c.hint}</span>
                </span>
              ),
              value: c.id,
            }))}
          />
          {contextMeta && (
            <Text className="ops-context-kicker" type="secondary">
              Contexto: <strong>{contextMeta.label}</strong>
            </Text>
          )}
        </div>
        <Tabs
          activeKey={activeTab}
          onChange={onTabChange}
          items={items}
          destroyOnHidden={false}
          tabBarGutter={0}
          size="middle"
          className={`ops-context-tabs ops-context-tabs--${activeContext}`}
        />
      </div>
    </OpsDrillDownProvider>
  )
}
