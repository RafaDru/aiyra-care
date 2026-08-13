import { useEffect, useState } from 'react'
import { Alert, Collapse, Table, Typography } from 'antd'
import { api } from '../../lib/api.js'
import { DismissibleHint } from '../ui/DismissibleHint.js'
import type { OcrStats, OcrStatsRow } from '../../lib/api.types.js'

const { Text } = Typography

function pct(n: number, total: number) {
  if (!total) return '—'
  return `${Math.round((n / total) * 100)}%`
}

export function OcrStatsPanel() {
  const [stats, setStats] = useState<OcrStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.documents.ocrStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar métricas'))
  }, [])

  const summary = stats?.summary
  const total = Number(summary?.total ?? 0)

  const columns = [
    { title: 'Tipo', dataIndex: 'document_type', key: 'type' },
    { title: 'Total', dataIndex: 'total', key: 'total' },
  {
      title: 'OCR ok',
      key: 'ocr_ok',
      render: (_: unknown, r: OcrStatsRow) => {
        const ok = Number(r.ocr_ok ?? 0)
        const t = Number(r.total ?? 0)
        return `${ok} (${pct(ok, t)})`
      },
    },
    {
      title: 'Parse ok',
      key: 'parse_ok',
      render: (_: unknown, r: OcrStatsRow) => {
        const ok = Number(r.parse_ok ?? 0)
        const t = Number(r.total ?? 0)
        return `${ok} (${pct(ok, t)})`
      },
    },
    {
      title: 'Qualidade média',
      dataIndex: 'avg_quality',
      key: 'avg_quality',
      render: (v: number | null) => v != null ? Number(v).toFixed(2) : '—',
    },
    {
      title: 'Fallback pago',
      dataIndex: 'paid_count',
      key: 'paid_count',
    },
  ]

  return (
    <Collapse
      style={{ marginBottom: 16 }}
      items={[
        {
          key: 'ocr-stats',
          label: 'Métricas de OCR (validação contínua)',
          children: error ? (
            <Alert type="error" message={error} />
          ) : !stats ? (
            <Text type="secondary">Carregando…</Text>
          ) : (
            <>
              <DismissibleHint
                hintId="ocr-stats.metrics-hint"
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message={
                  <span>
                    {total} documentos · OCR processado: {Number(summary?.ocr_ok ?? 0)} ({pct(Number(summary?.ocr_ok ?? 0), total)})
                    · parse estruturado ok: {Number(summary?.parse_ok ?? 0)} ({pct(Number(summary?.parse_ok ?? 0), total)})
                    · fallback pago: {Number(summary?.paid_count ?? 0)}
                    {summary?.avg_quality != null && (
                      <> · qualidade média: {Number(summary.avg_quality).toFixed(2)}</>
                    )}
                  </span>
                }
                description="Use estas métricas para ver se o cascade (Tesseract/TrOCR/Vision) e a interpretação por IA estão entregando texto útil por tipo de documento."
              />
              <Table
                size="small"
                pagination={false}
                rowKey="document_type"
                dataSource={stats.byType}
                columns={columns}
              />
            </>
          ),
        },
      ]}
    />
  )
}
