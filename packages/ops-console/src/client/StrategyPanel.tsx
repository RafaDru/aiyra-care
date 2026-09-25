import { useEffect, useState } from 'react'
import { Alert, Collapse, Space, Tabs, Typography } from 'antd'
import { opsApi } from './api.js'
import { OpsPanel } from './components/OpsPanel.js'
import { StrategyMarkdown } from './StrategyMarkdown.js'
import type { StrategyContentPayload, StrategySectionId } from './ops.types.js'

const { Text } = Typography

const STRATEGY_STORAGE_KEY = 'ops-console-strategy-section'

const SECTION_ITEMS: { key: StrategySectionId; label: string }[] = [
  { key: 'mkt', label: 'Marketing' },
  { key: 'finance', label: 'Financeiro' },
  { key: 'cx', label: 'Experiência (CX)' },
]

function CxSeverityCallout() {
  return (
    <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 16 }}>
      <Alert
        type="error"
        showIcon
        message="S1 — Bloco Hoje no Início"
        description={
          <>
            O bloco <strong>Hoje</strong> não renderiza sem perfil na lente («Quem ver hoje»).
            Novatos que pulam o dependente ficam sem hub de dia a dia — ver achado H2 no relatório.
          </>
        }
      />
      <Alert
        type="warning"
        showIcon
        message="S2 — Pilha pós-login"
        description={
          <>
            Modais em sequência: compliance LGPD + tour «Primeiros passos» (+ onboarding longo).
            Reforça carga cognitiva no D0 — ver achado H1; quick wins S2→S3 no TL;DR.
          </>
        }
      />
    </Space>
  )
}

export function StrategyPanel({
  section,
  onSectionChange,
  hideSectionTabs = false,
}: {
  section: StrategySectionId
  onSectionChange: (section: StrategySectionId) => void
  /** Quando a aba principal já é Marketing/Finanças/Estratégia (CX). */
  hideSectionTabs?: boolean
}) {
  const [content, setContent] = useState<StrategyContentPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(null)
    opsApi
      .strategyContent(section)
      .then(setContent)
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar'))
      .finally(() => setLoading(false))
  }, [section])

  const onSubTabChange = (key: string) => {
    const next = key as StrategySectionId
    onSectionChange(next)
    localStorage.setItem(STRATEGY_STORAGE_KEY, next)
  }

  if (loading && !content) {
    return <OpsPanel title="Estratégia" description="Carregando relatórios…" />
  }
  if (error) {
    return (
      <OpsPanel title="Estratégia">
        <Text type="danger">{error}</Text>
      </OpsPanel>
    )
  }
  if (!content) return null

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <OpsPanel
        title="Estratégia — advisory interno"
        description={`Snapshot ${content.updatedAt} · Marketing, Financeiro e CX (sem PHI) · fonte: content/strategy/`}
      >
        <Text type="secondary">
          Relatórios round 1 para alinhar Command Hub com advisors do Project store. Não substituem
          feature cards nem QA de produto.
        </Text>
      </OpsPanel>

      {!hideSectionTabs && (
        <div className="ops-strategy-subtabs">
          <Tabs
            activeKey={section}
            onChange={onSubTabChange}
            items={SECTION_ITEMS.map((item) => ({ key: item.key, label: item.label }))}
            size="small"
          />
        </div>
      )}

      <OpsPanel title={content.title}>
        {section === 'cx' && <CxSeverityCallout />}
        <StrategyMarkdown content={content.primaryMarkdown} />
        {content.secondaryMarkdown && (
          <Collapse
            style={{ marginTop: 24 }}
            items={[
              {
                key: 'round2',
                label: content.secondaryTitle ?? 'Documento secundário',
                children: <StrategyMarkdown content={content.secondaryMarkdown} />,
              },
            ]}
          />
        )}
        <footer className="ops-strategy-footnotes">
          <Text type="secondary">
            Advisor skill (Project store): <Text code>{content.advisorSkill}</Text>
          </Text>
        </footer>
      </OpsPanel>
    </Space>
  )
}

export function readStoredStrategySection(): StrategySectionId | null {
  const saved = localStorage.getItem(STRATEGY_STORAGE_KEY)
  if (saved === 'mkt' || saved === 'finance' || saved === 'cx') return saved
  return null
}

export function readStrategySectionFromUrl(): StrategySectionId | null {
  const fromUrl = new URLSearchParams(window.location.search).get('strategy')
  if (fromUrl === 'mkt' || fromUrl === 'finance' || fromUrl === 'cx') return fromUrl
  return null
}
