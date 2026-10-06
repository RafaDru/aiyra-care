import { useEffect, useMemo, useState } from 'react'
import { Empty, Space, Typography } from 'antd'
import { opsApi } from './api.js'
import { OpsPanel } from './components/OpsPanel.js'
import type {
  ProductMaturityBoardSnapshot,
  ProductMaturityItem,
  ProductMaturityLevel,
} from './ops.types.js'

const { Text, Link, Paragraph } = Typography

const MATURITY_ORDER: ProductMaturityLevel[] = [
  'mature',
  'operational',
  'partial',
  'pilot',
  'planned',
]

const MATURITY_LABEL: Record<ProductMaturityLevel, string> = {
  mature: 'Maduro',
  operational: 'Operacional',
  partial: 'Parcial',
  pilot: 'Piloto',
  planned: 'Planejado',
}

const REPO_DOC_BASE =
  'https://github.com/RafaDru/aiyra-care/blob/main/'

function docHref(doc?: string): string | undefined {
  if (!doc?.trim()) return undefined
  const path = doc.replace(/^\//, '')
  return `${REPO_DOC_BASE}${path}`
}

function countByMaturity(items: ProductMaturityItem[]): Record<ProductMaturityLevel, number> {
  const counts: Record<ProductMaturityLevel, number> = {
    mature: 0,
    operational: 0,
    partial: 0,
    pilot: 0,
    planned: 0,
  }
  for (const item of items) {
    counts[item.maturity] += 1
  }
  return counts
}

function MaturityCard({ item }: { item: ProductMaturityItem }) {
  const href = docHref(item.doc)
  return (
    <article className={`ch-maturity-card ch-maturity-card--${item.maturity}`}>
      <div className="ch-maturity-card-head">
        <span className="ch-maturity-pill">{MATURITY_LABEL[item.maturity]}</span>
        <h4 className="ch-maturity-card-title">{item.title}</h4>
      </div>
      <p className="ch-maturity-card-note">{item.note}</p>
      {href ? (
        <Link href={href} target="_blank" rel="noreferrer" className="ch-maturity-card-doc">
          {item.doc}
        </Link>
      ) : null}
    </article>
  )
}

export function ProdutoMaturidadePanel() {
  const [data, setData] = useState<ProductMaturityBoardSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    opsApi
      .productMaturityBoard()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar'))
      .finally(() => setLoading(false))
  }, [])

  const allItems = useMemo(() => {
    if (!data) return []
    return [...data.surfaces, ...data.domains.flatMap((d) => d.items)]
  }, [data])

  const kpiCounts = useMemo(() => countByMaturity(allItems), [allItems])

  if (loading) {
    return <OpsPanel title="Maturidade" description="Carregando quadro de maturidade…" />
  }
  if (error) {
    return (
      <OpsPanel title="Maturidade">
        <Text type="danger">{error}</Text>
      </OpsPanel>
    )
  }
  if (!data) return <Empty description="Sem dados de maturidade" />

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }} className="ch-maturity-panel">
      <div className="ch-maturity-ribbon" role="status">
        <strong>Produto — maturidade estratégica</strong>
        <span>Atualizado {data.updatedAt} · fonte {data.sourceRelativePath}</span>
      </div>

      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
        {data.summary}
      </Paragraph>

      <div className="ch-maturity-kpi-row" aria-label="Contagem por nível de maturidade">
        {MATURITY_ORDER.map((level) => (
          <div key={level} className={`ch-maturity-kpi ch-maturity-kpi--${level}`}>
            <div className="ch-maturity-kpi-label">{MATURITY_LABEL[level]}</div>
            <div className="ch-maturity-kpi-value">{kpiCounts[level]}</div>
          </div>
        ))}
      </div>

      <OpsPanel title="Superfícies" description="Canais de entrega e runtime.">
        <div className="ch-maturity-grid">
          {data.surfaces.map((s) => (
            <MaturityCard key={s.id} item={s} />
          ))}
        </div>
      </OpsPanel>

      {data.domains.map((domain) => (
        <OpsPanel
          key={domain.id}
          title={domain.title}
          description={`${domain.items.length} capacidade(s) rastreadas`}
        >
          <div className="ch-maturity-grid">
            {domain.items.map((item) => (
              <MaturityCard key={item.id} item={item} />
            ))}
          </div>
        </OpsPanel>
      ))}
    </Space>
  )
}
