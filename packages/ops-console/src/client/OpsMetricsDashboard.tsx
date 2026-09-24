import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { opsApi } from './api.js'
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
import { IncidentesPanel } from './IncidentesPanel.js'
import { ProdutoLifecyclePanel } from './ProdutoLifecyclePanel.js'
import {
  readStoredStrategySection,
  readStrategySectionFromUrl,
  StrategyPanel,
} from './StrategyPanel.js'
import { OpsDrillDownProvider } from './ops-drill-down.js'
import type { StrategySectionId } from './ops.types.js'
import {
  CH_NAV_GROUPS,
  getGroup,
  getNavItem,
  lastTabForGroup,
  persistNav,
  readNavFromUrl,
  tabToGroup,
  writeNavToUrl,
  type ChGroupId,
  type ChTabKey,
} from './ch-navigation.js'
import { ChLayout } from './components/ChLayout.js'
import type { OpsDeploymentTier } from './theme/ops-environment.js'
import { mergeServicesStatus, type ChServiceState } from './ch-service-status.js'

function resolveInitialStrategySection(): StrategySectionId {
  return readStrategySectionFromUrl() ?? readStoredStrategySection() ?? 'mkt'
}

export function OpsMetricsDashboard({
  data,
  runtime,
  stackSlot,
  onRefresh,
  deploymentTier,
  headerActions,
  footerStatus,
}: {
  data: OpsMetricsResponse
  runtime?: RuntimeDegradedView
  stackSlot?: ReactNode
  onRefresh?: () => void
  deploymentTier: OpsDeploymentTier
  headerActions?: ReactNode
  footerStatus?: ReactNode
}) {
  const metrics = data.metrics
  const [issueAttention, setIssueAttention] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const highlightInvestigationId = useMemo(
    () => new URLSearchParams(window.location.search).get('investigationId'),
    [],
  )

  const [strategySection, setStrategySection] = useState<StrategySectionId>(resolveInitialStrategySection)

  const initialNav = useMemo(() => readNavFromUrl(), [])
  const [groupId, setGroupId] = useState<ChGroupId>(initialNav.group)
  const [activeTab, setActiveTab] = useState<ChTabKey>(initialNav.tab)
  const [webStatus, setWebStatus] = useState<ChServiceState>('unknown')
  const [backendStatus, setBackendStatus] = useState<ChServiceState>('unknown')

  useEffect(() => {
    const loadServices = () => {
      void opsApi.servicesStatus()
        .then((s) => {
          setWebStatus(s.web)
          setBackendStatus(s.backend)
        })
        .catch(() => {
          const merged = mergeServicesStatus(metrics.probe, null)
          setBackendStatus(merged.backend)
          setWebStatus(merged.web)
        })
    }
    loadServices()
    const id = window.setInterval(loadServices, 60_000)
    return () => window.clearInterval(id)
  }, [data, metrics.probe])

  useEffect(() => {
    void opsApi.analysisAttentionCounts().then((c) => {
      setIssueAttention(c.totalAttention)
    }).catch(() => undefined)
  }, [data])

  useEffect(() => {
    if (highlightInvestigationId) {
      setGroupId('operacao')
      setActiveTab('incidentes')
      persistNav('operacao', 'incidentes')
      writeNavToUrl('operacao', 'incidentes')
    }
  }, [highlightInvestigationId])

  const tabCounts = useMemo((): Partial<Record<ChTabKey, number>> => ({
    overview: data.alerts.filter((a) => a.severity === 'critical').length,
    incidentes: issueAttention,
    product: countHotFeatures(metrics),
    support: metrics.supportReports?.openCount ?? 0,
    sync: metrics.sync.stuckJobs.length,
    ava: metrics.productEvents.last5m.avaChatFailed,
    infra: countInfraIssues(metrics),
    cost: metrics.internalLlm?.exhausted ? 1 : metrics.internalLlm?.budgetExhausted ?? 0,
  }), [data.alerts, metrics, issueAttention])

  const tabAlert = useMemo((): Partial<Record<ChTabKey, boolean>> => ({
    overview: (tabCounts.overview ?? 0) > 0,
    incidentes: (tabCounts.incidentes ?? 0) > 0,
    product: (tabCounts.product ?? 0) > 0,
    support: (tabCounts.support ?? 0) > 0,
    sync: (tabCounts.sync ?? 0) > 0,
    ava: (tabCounts.ava ?? 0) > 0,
    infra: (tabCounts.infra ?? 0) > 0,
    cost: (tabCounts.cost ?? 0) > 0,
  }), [tabCounts])

  const groupAlertCounts = useMemo(() => {
    const out: Partial<Record<ChGroupId, number>> = {}
    for (const g of CH_NAV_GROUPS) {
      let n = 0
      for (const item of g.items) {
        if ((tabCounts[item.tab] ?? 0) > 0 && tabAlert[item.tab]) n += 1
      }
      if (n > 0) out[g.id] = n
    }
    return out
  }, [tabCounts, tabAlert])

  const onSelectGroup = (id: ChGroupId) => {
    const nextTab = lastTabForGroup(id)
    setGroupId(id)
    setActiveTab(nextTab)
    persistNav(id, nextTab)
    writeNavToUrl(id, nextTab, nextTab === 'strategy' ? { strategy: strategySection } : undefined)
  }

  const onSelectTab = (tab: ChTabKey) => {
    const g = tabToGroup(tab)
    setGroupId(g)
    setActiveTab(tab)
    persistNav(g, tab)
    writeNavToUrl(g, tab, tab === 'strategy' ? { strategy: strategySection } : undefined)
  }

  const onStrategySectionChange = (section: StrategySectionId) => {
    setStrategySection(section)
    writeNavToUrl(groupId, 'strategy', { strategy: section })
  }

  const group = getGroup(groupId)
  const navItem = getNavItem(activeTab) ?? group.items[0]

  const panel = (() => {
    switch (activeTab) {
      case 'overview':
        return <OverviewPanel data={data} onRefresh={onRefresh} />
      case 'business':
        return <BusinessPanel data={data} />
      case 'strategy':
        return <StrategyPanel section={strategySection} onSectionChange={onStrategySectionChange} />
      case 'incidentes':
        return (
          <IncidentesPanel
            onRefresh={onRefresh}
            highlightInvestigationId={highlightInvestigationId}
          />
        )
      case 'produto':
        return <ProdutoLifecyclePanel />
      case 'product':
        return <ProductPanel data={data} />
      case 'support':
        return (
          <SupportPanel
            openCount={metrics.supportReports?.openCount ?? 0}
            submitted24h={metrics.supportReports?.submitted24h ?? 0}
            submittedSparkline={metrics.timeSeries24h?.supportReportsSubmitted?.map((r) => r.count)}
            onQueueChange={onRefresh}
          />
        )
      case 'sync':
        return <SyncPanel data={data} />
      case 'ava':
        return <AvaPanel data={data} />
      case 'infra':
        return (
          <InfraPanel data={data} runtime={runtime} stackSlot={stackSlot} onRefresh={onRefresh} />
        )
      case 'cost':
        return <CostPanel data={data} />
      default:
        return null
    }
  })()

  return (
    <OpsDrillDownProvider data={data}>
      <ChLayout
        group={group}
        item={navItem}
        activeTab={activeTab}
        deploymentTier={deploymentTier}
        webStatus={webStatus}
        backendStatus={backendStatus}
        headerActions={headerActions}
        footer={
          <>
            <span>{footerStatus}</span>
            <a
              href="https://github.com/RafaDru/aiyra-care/blob/main/docs/ops/README.md"
              target="_blank"
              rel="noreferrer"
            >
              Documentação CH
            </a>
          </>
        }
        tabCounts={tabCounts}
        tabAlert={tabAlert}
        groupAlertCounts={groupAlertCounts}
        mobileNavOpen={mobileNavOpen}
        onOpenMobileNav={() => setMobileNavOpen(true)}
        onCloseMobileNav={() => setMobileNavOpen(false)}
        onSelectGroup={onSelectGroup}
        onSelectTab={onSelectTab}
      >
        <div className="ops-tab-panel" style={{ padding: 0, gap: 16 }}>{panel}</div>
      </ChLayout>
    </OpsDrillDownProvider>
  )
}
