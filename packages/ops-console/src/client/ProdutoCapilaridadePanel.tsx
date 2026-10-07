import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircleFilled,
  ClockCircleFilled,
  ExclamationCircleFilled,
} from '@ant-design/icons'
import { Empty, List, Space, Typography } from 'antd'
import { opsApi } from './api.js'
import { OpsPanel } from './components/OpsPanel.js'
import type {
  GrowthChannelStatus,
  GrowthConsultorioBoardSnapshot,
  GrowthPhaseStatus,
} from './ops.types.js'

const { Text, Link, Paragraph } = Typography

const PHASE_STATUS_ORDER: GrowthPhaseStatus[] = ['done', 'partial', 'planned']

const PHASE_STATUS_LABEL: Record<GrowthPhaseStatus, string> = {
  done: 'Entregue',
  partial: 'Parcial',
  planned: 'Planejado',
}

const CHANNEL_STATUS_LABEL: Record<GrowthChannelStatus, string> = {
  done: 'Feito',
  partial: 'Parcial',
  planned: 'Planejado',
}

/** Reuse maturity accent tokens for phase cards. */
const PHASE_STATUS_MATURITY: Record<GrowthPhaseStatus, string> = {
  done: 'operational',
  partial: 'partial',
  planned: 'planned',
}

const REPO_DOC_BASE = 'https://github.com/RafaDru/aiyra-care/blob/main/'

function docHref(doc?: string): string | undefined {
  if (!doc?.trim()) return undefined
  return `${REPO_DOC_BASE}${doc.replace(/^\//, '')}`
}

function countByPhaseStatus(
  phases: GrowthConsultorioBoardSnapshot['phases'],
): Record<GrowthPhaseStatus, number> {
  const counts: Record<GrowthPhaseStatus, number> = { done: 0, partial: 0, planned: 0 }
  for (const p of phases) counts[p.status] += 1
  return counts
}

function ChannelStatusIcon({ status }: { status: GrowthChannelStatus }) {
  if (status === 'done') {
    return <CheckCircleFilled style={{ color: '#059669', fontSize: 18 }} aria-hidden />
  }
  if (status === 'partial') {
    return <ExclamationCircleFilled style={{ color: '#d97706', fontSize: 18 }} aria-hidden />
  }
  return <ClockCircleFilled style={{ color: '#64748b', fontSize: 18 }} aria-hidden />
}

export function ProdutoCapilaridadePanel() {
  const [data, setData] = useState<GrowthConsultorioBoardSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    opsApi
      .growthConsultorioBoard()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar'))
      .finally(() => setLoading(false))
  }, [])

  const phaseKpi = useMemo(() => (data ? countByPhaseStatus(data.phases) : null), [data])

  if (loading) {
    return <OpsPanel title="Capilarização" description="Carregando board GTM consultório…" />
  }
  if (error) {
    return (
      <OpsPanel title="Capilarização">
        <Text type="danger">{error}</Text>
      </OpsPanel>
    )
  }
  if (!data) return <Empty description="Sem dados de capilarização" />

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }} className="ch-capilaridade-panel">
      <div className="ch-maturity-ribbon" role="status">
        <strong>GTM — família → médico → consultório</strong>
        <span>Atualizado {data.updatedAt} · {data.sourceRelativePath}</span>
      </div>

      <Paragraph type="secondary" style={{ marginBottom: 0 }}>{data.summary}</Paragraph>

      {phaseKpi ? (
        <div className="ch-maturity-kpi-row" aria-label="Contagem por status de fase">
          {PHASE_STATUS_ORDER.map((status) => (
            <div
              key={status}
              className={`ch-maturity-kpi ch-maturity-kpi--${PHASE_STATUS_MATURITY[status]}`}
            >
              <div className="ch-maturity-kpi-label">{PHASE_STATUS_LABEL[status]}</div>
              <div className="ch-maturity-kpi-value">{phaseKpi[status]}</div>
            </div>
          ))}
        </div>
      ) : null}

      <OpsPanel title="Fases A–D" description="Roadmap de capilarização no consultório">
        <div className="ch-maturity-grid">
          {data.phases.map((phase) => {
            const maturityClass = PHASE_STATUS_MATURITY[phase.status]
            const href = docHref(phase.doc)
            return (
              <article
                key={phase.id}
                className={`ch-maturity-card ch-maturity-card--${maturityClass}`}
              >
                <div className="ch-maturity-card-head">
                  <span className="ch-maturity-pill">
                    Fase {phase.id} · {PHASE_STATUS_LABEL[phase.status]}
                  </span>
                  <h4 className="ch-maturity-card-title">{phase.title}</h4>
                </div>
                <p className="ch-maturity-card-note">
                  <strong>{phase.headline}</strong>
                  <br />
                  {phase.note}
                </p>
                {href ? (
                  <Link href={href} target="_blank" rel="noreferrer" className="ch-maturity-card-doc">
                    {phase.doc}
                  </Link>
                ) : null}
              </article>
            )
          })}
        </div>
      </OpsPanel>

      <OpsPanel title="Funil" description="Cuidador → share → médico → conta pro">
        <div className="ch-capilaridade-funnel" role="img" aria-label="Funil capilarização">
          <div className="ch-capilaridade-funnel-step ch-capilaridade-funnel-step--1">Cuidador</div>
          <div className="ch-capilaridade-funnel-step ch-capilaridade-funnel-step--2">Share consultório</div>
          <div className="ch-capilaridade-funnel-step ch-capilaridade-funnel-step--3">Médico (portal)</div>
          <div className="ch-capilaridade-funnel-step ch-capilaridade-funnel-step--4">Conta pro</div>
        </div>
      </OpsPanel>

      <OpsPanel title="Canais ao médico" description="Checklist de chegada — done / parcial / planejado">
        <div className="ch-capilaridade-channel-grid">
          {data.channels.map((ch) => (
            <div key={ch.id} className={`ch-capilaridade-channel ch-capilaridade-channel--${ch.status}`}>
              <ChannelStatusIcon status={ch.status} />
              <div className="ch-capilaridade-channel-body">
                <div className="ch-capilaridade-channel-name">{ch.name}</div>
                <Text type="secondary" className="ch-capilaridade-channel-meta">
                  {CHANNEL_STATUS_LABEL[ch.status]}
                  {ch.featureRef ? ` · ${ch.featureRef}` : ''}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </OpsPanel>

      <OpsPanel title="Métricas norte" description="Telemetria sem PHI">
        <List
          size="small"
          dataSource={data.northStarMetrics}
          renderItem={(m) => (
            <List.Item>
              <Text strong>{m.label}</Text>
              <Text type="secondary"> — {m.event} ({m.stage})</Text>
            </List.Item>
          )}
        />
      </OpsPanel>

      <OpsPanel title="Decisões abertas" description="Gates estratégicos (Rafael)">
        <List
          size="small"
          dataSource={data.openDecisions}
          renderItem={(d) => (
            <List.Item>
              <Text>{d.question}</Text>
              <Text type="secondary"> — {d.owner}</Text>
            </List.Item>
          )}
        />
      </OpsPanel>
    </Space>
  )
}
