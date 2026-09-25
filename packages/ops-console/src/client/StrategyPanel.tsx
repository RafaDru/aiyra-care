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
  prominent,
}: {
  section: StrategySectionId
  onSectionChange: (section: StrategySectionId) => void
  prominent?: boolean
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
    return (
      <OpsPanel title="Financeiro & Marketing" description="Carregando relatórios…">
        <Text type="secondary">…</Text>
      </OpsPanel>
    )
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
      {prominent && (
        <Alert
          type="success"
          showIcon
          message="Financeiro & Marketing (advisory)"
          description="Relatórios round 1 em content/strategy/ — use as sub-abas MKT, Financeiro e CX abaixo. Atualize os markdown no monorepo ou Project store e recarregue o console."
        />
      )}
      <OpsPanel
        title="Financeiro & Marketing — advisory interno"
        description={`Snapshot ${content.updatedAt} · sem PHI · fonte: packages/ops-console/content/strategy/`}
      >
        <Text type="secondary">
          Narrativa de go-to-market, unit economics e jornada CX para o Command Hub. Não substituem
          feature cards nem métricas live em Negócio.
        </Text>
      </OpsPanel>

      <div className="ops-strategy-subtabs">
        <Tabs
          activeKey={section}
          onChange={onSubTabChange}
          items={SECTION_ITEMS.map((item) => ({ key: item.key, label: item.label }))}
          size="small"
        />
      </div>

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
