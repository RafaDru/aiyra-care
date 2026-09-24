import { useMemo, useState } from 'react'
import { Button, Tag } from 'antd'
import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import {
  CH_NAV_GROUPS,
  getGroup,
  getNavItem,
  lastTabForGroup,
  normalizeChGroupId,
  persistNav,
  type ChGroupId,
  type ChTabKey,
  writeNavToUrl,
} from '../ch-navigation.js'
import { ChLayout } from '../components/ChLayout.js'

const MOCK_TAB_COUNTS: Partial<Record<ChTabKey, boolean>> = {
  incidentes: true,
  infra: true,
  support: true,
}

const MOCK_COUNTS: Partial<Record<ChTabKey, number>> = {
  incidentes: 2,
  infra: 1,
  support: 3,
  overview: 1,
}

function readMockNav() {
  const params = new URLSearchParams(window.location.search)
  const group = normalizeChGroupId(params.get('group')) ?? 'operacao'
  const tab = (params.get('tab') as ChTabKey) || 'overview'
  const g = CH_NAV_GROUPS.some((x) => x.id === group) ? group : 'operacao'
  const validTab = getGroup(g).items.some((i) => i.tab === tab) ? tab : getGroup(g).items[0].tab
  return { group: g, tab: validTab }
}

export function ChLayoutMockPage() {
  const initial = useMemo(() => readMockNav(), [])
  const [groupId, setGroupId] = useState<ChGroupId>(initial.group)
  const [tab, setTab] = useState<ChTabKey>(initial.tab)

  const group = getGroup(groupId)
  const item = getNavItem(tab) ?? group.items[0]

  const groupAlertCounts = useMemo(() => {
    const out: Partial<Record<ChGroupId, number>> = {}
    for (const g of CH_NAV_GROUPS) {
      let n = 0
      for (const i of g.items) {
        if (MOCK_TAB_COUNTS[i.tab] && (MOCK_COUNTS[i.tab] ?? 0) > 0) n += 1
      }
      if (n > 0) out[g.id] = n
    }
    return out
  }, [])

  const tabAlert = useMemo(() => {
    const out: Partial<Record<ChTabKey, boolean>> = {}
    for (const [k, v] of Object.entries(MOCK_TAB_COUNTS)) {
      if (v) out[k as ChTabKey] = true
    }
    return out
  }, [])

  const selectGroup = (id: ChGroupId) => {
    const nextTab = lastTabForGroup(id)
    setGroupId(id)
    setTab(nextTab)
    persistNav(id, nextTab)
    writeNavToUrl(id, nextTab)
  }

  const selectTab = (t: ChTabKey) => {
    setTab(t)
    persistNav(groupId, t)
    writeNavToUrl(groupId, t)
  }

  return (
    <>
    <div className="ch-mock-ribbon" role="status">
      <strong>Pré-visualização — Command Hub Care</strong>
      <span>— dados fictícios, sem Postgres. Troque de zona no topo e de tela na barra lateral.</span>
      <a href="/" className="ch-mock-ribbon-link">Abrir console com métricas reais</a>
    </div>
    <ChLayout
      group={group}
      item={item}
      activeTab={tab}
      deploymentTier="integration"
      webStatus="up"
      backendStatus="degraded"
      headerActions={
        <>
          <Tag color="blue">Mock visual</Tag>
          <Button icon={<ReloadOutlined />}>Atualizar</Button>
          <Button type="primary" icon={<ThunderboltOutlined />}>Verificar e acionar</Button>
        </>
      }
      footer={
        <>
          <span>
            Snapshot {new Date().toLocaleString('pt-BR')} · Probe ok · 3 alertas · Auto-refresh 60s
          </span>
          <a
            href="https://github.com/RafaDru/aiyra-care/blob/main/docs/ops/README.md"
            target="_blank"
            rel="noreferrer"
          >
            Documentação CH
          </a>
        </>
      }
      tabCounts={MOCK_COUNTS}
      tabAlert={tabAlert}
      groupAlertCounts={groupAlertCounts}
      onSelectGroup={selectGroup}
      onSelectTab={selectTab}
    >
      <p style={{ color: '#64748b', marginTop: 0 }}>
        Pré-visualização do layout — dados fictícios. Remova <code>?mock=ch-layout</code> para o
        console com métricas reais.
      </p>
      <div className="ch-mock-placeholder">
        <div className="ch-mock-kpi">
          <div className="ch-mock-kpi-label">Alertas critical</div>
          <div className="ch-mock-kpi-value">1</div>
        </div>
        <div className="ch-mock-kpi">
          <div className="ch-mock-kpi-label">Sync fail 24h</div>
          <div className="ch-mock-kpi-value">4%</div>
        </div>
        <div className="ch-mock-kpi">
          <div className="ch-mock-kpi-label">Suporte aberto</div>
          <div className="ch-mock-kpi-value">3</div>
        </div>
        <div className="ch-mock-kpi">
          <div className="ch-mock-kpi-label">Tela ativa</div>
          <div className="ch-mock-kpi-value" style={{ fontSize: 14 }}>{tab}</div>
        </div>
      </div>
    </ChLayout>
    </>
  )
}
