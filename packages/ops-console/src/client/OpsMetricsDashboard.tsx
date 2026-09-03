import { useMemo, useState, type ReactNode } from 'react'
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

const TAB_STORAGE_KEY = 'ops-console-active-tab'

type TabKey = 'overview' | 'product' | 'sync' | 'ava' | 'infra' | 'cost'

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
}: {
  data: OpsMetricsResponse
  runtime?: RuntimeDegradedView
  stackSlot?: ReactNode
}) {
  const metrics = data.metrics
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY)
    if (
      saved === 'overview' || saved === 'product' || saved === 'sync'
      || saved === 'ava' || saved === 'infra' || saved === 'cost'
    ) {
      return saved
    }
    return 'overview'
  })

  const badges = useMemo(() => ({
    overview: data.alerts.filter((a) => a.severity === 'critical').length,
    product: countHotFeatures(metrics),
    sync: metrics.sync.stuckJobs.length,
    ava: metrics.productEvents.last5m.avaChatFailed,
    infra: countInfraIssues(metrics),
    cost: metrics.internalLlm?.exhausted ? 1 : metrics.internalLlm?.budgetExhausted ?? 0,
  }), [data.alerts, metrics])

  const onTabChange = (key: string) => {
    const tab = key as TabKey
    setActiveTab(tab)
    localStorage.setItem(TAB_STORAGE_KEY, tab)
  }

  const items = [
    {
      key: 'overview',
      label: <TabLabel text="Visão geral" count={badges.overview} alert />,
      children: (
        <div className="ops-tab-panel">
          <OverviewPanel data={data} />
        </div>
      ),
    },
    {
      key: 'product',
      label: <TabLabel text="Produto & UX" count={badges.product} alert={badges.product > 0} />,
      children: (
        <div className="ops-tab-panel">
          <ProductPanel data={data} />
        </div>
      ),
    },
    {
      key: 'sync',
      label: <TabLabel text="Sync" count={badges.sync} alert={badges.sync > 0} />,
      children: (
        <div className="ops-tab-panel">
          <SyncPanel data={data} />
        </div>
      ),
    },
    {
      key: 'ava',
      label: <TabLabel text="Ava & LLM" count={badges.ava} alert={badges.ava > 0} />,
      children: (
        <div className="ops-tab-panel">
          <AvaPanel data={data} />
        </div>
      ),
    },
    {
      key: 'infra',
      label: <TabLabel text="Infra" count={badges.infra} alert={badges.infra > 0} />,
      children: (
        <div className="ops-tab-panel">
          <InfraPanel data={data} runtime={runtime} stackSlot={stackSlot} />
        </div>
      ),
    },
    {
      key: 'cost',
      label: <TabLabel text="Custo interno" count={badges.cost} alert={badges.cost > 0} />,
      children: (
        <div className="ops-tab-panel">
          <CostPanel data={data} />
        </div>
      ),
    },
  ]

  return (
    <div className="ops-tabs-card">
      <Tabs
        activeKey={activeTab}
        onChange={onTabChange}
        items={items}
        destroyOnHidden={false}
        tabBarGutter={0}
        size="middle"
      />
    </div>
  )
}
