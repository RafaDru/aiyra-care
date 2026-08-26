import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, List, Spin, Tag, Typography } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { api } from '../../lib/api.js'
import type { PatientContext } from '../../lib/api.types.js'
import { PatientContextTimeline } from './PatientContextTimeline.js'
import { PatientClinicalExportModal } from './PatientClinicalExportModal.js'
import { usePatientSyncCompletions } from '../../hooks/usePatientSyncCompletions.js'
import {
  HEALTH_THREAD_STATUS_LABEL,
  healthThreadKindLabel,
} from './health-thread-kinds.js'
import { DismissibleHint } from '../ui/DismissibleHint.js'
import { PatientPendenciesSection } from './PatientPendenciesSection.js'
import { subscribeClinicalExportOpen } from '../../lib/clinical-export-bus.js'

const { Paragraph, Text } = Typography

interface PatientContextPanelProps {
  patientId: string
  onOpenThread?: (threadId: string) => void
}

export function PatientContextPanel({ patientId, onOpenThread }: PatientContextPanelProps) {
  const [context, setContext] = useState<PatientContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  const reloadContext = useCallback(() => {
    setLoading(true)
    setError(null)
    api.patients
      .context(patientId)
      .then(setContext)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar contexto'))
      .finally(() => setLoading(false))
  }, [patientId])

  useEffect(() => {
    reloadContext()
  }, [reloadContext])

  usePatientSyncCompletions(patientId, reloadContext)

  useEffect(() => {
    return subscribeClinicalExportOpen((req) => {
      if (req.patientId === patientId) setExportOpen(true)
    })
  }, [patientId])

  if (loading) return <Spin style={{ display: 'block', margin: '16px auto' }} />
  if (error) return <Alert type="error" message={error} showIcon />
  if (!context) return null

  const threadPendencies = context.pendencies.filter((p) => p.threadId)
  const otherPendencies = context.pendencies.filter((p) => !p.threadId)

  return (
    <>
      <Card
        title="Resumo clínico"
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          <Button
            size="small"
            type="link"
            icon={<PrinterOutlined />}
            onClick={() => setExportOpen(true)}
          >
            Imprimir / PDF
          </Button>
        }
      >
      <Paragraph style={{ marginBottom: 16 }}>{context.textSummary}</Paragraph>

      {context.alerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>Alertas</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {context.alerts.map((alert, i) => (
              <DismissibleHint
                key={`${alert.kind}-${i}`}
                hintId={`context-alert.${patientId}.${alert.kind}.${alert.title}`}
                type={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
                message={alert.title}
                description={alert.detail}
                showIcon
              />
            ))}
          </div>
        </div>
      )}

      <PatientPendenciesSection pendencies={otherPendencies} />

      {context.activeThreads.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>Em acompanhamento</Text>
          <List
            size="small"
            style={{ marginTop: 8 }}
            dataSource={context.activeThreads.slice(0, 5)}
            renderItem={(thread) => {
              const overdue = thread.dueDate && new Date(thread.dueDate).getTime() < Date.now()
              const threadPendency = threadPendencies.find((p) => p.threadId === thread.id)
              return (
                <List.Item
                  style={{ cursor: onOpenThread ? 'pointer' : undefined }}
                  onClick={() => onOpenThread?.(thread.id)}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Tag color="blue">{healthThreadKindLabel(thread.kind as 'task', true)}</Tag>
                      <Text strong>{thread.title}</Text>
                      {overdue && <Tag color="error">Prazo vencido</Tag>}
                      {thread.linkCount === 0 && <Tag>Vincular registros</Tag>}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {HEALTH_THREAD_STATUS_LABEL[thread.status] ?? thread.status}
                      {thread.dueDate
                        ? ` · Prazo ${new Date(thread.dueDate).toLocaleDateString('pt-BR')}`
                        : ''}
                      {thread.linkCount > 0 ? ` · ${thread.linkCount} vínculo(s)` : ''}
                    </Text>
                    {threadPendency?.detail && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{threadPendency.detail}</Text>
                      </div>
                    )}
                  </div>
                </List.Item>
              )
            }}
          />
        </div>
      )}

      {context.timeline.length > 0 && (
        <PatientContextTimeline events={context.timeline} maxItems={8} />
      )}
      </Card>

      <PatientClinicalExportModal
        open={exportOpen}
        patientId={patientId}
        context={context}
        onClose={() => setExportOpen(false)}
      />
    </>
  )
}
