import { useEffect, useRef, useState } from 'react'
import { Modal, Steps, Typography, Spin, Button, Space, Descriptions, List, Tag } from 'antd'
import { LoadingOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons'
import { api } from '../../lib/api.js'

const { Text, Title } = Typography

interface SyncResult {
  exams: number
  medicalRecords: number
  authorizations: number
  authorizationItems: number
  updatedAuthorizations: number
  total: number
        authorizationDetails: Array<{
          solicitationNumber?: string
          classification?: string
          doctorName?: string
          itemCount: number
          action: 'created' | 'updated'
          linkedConsultaId?: string
          linkedConsultaDate?: string
        }>
}

interface Props {
  jobId: string | null
  onDone: () => void
  onError: (msg: string) => void
}

const STEPS = [
  { key: 'navigate', title: 'Abrindo portal' },
  { key: 'login', title: 'Autenticando' },
  { key: 'fetch-extrato', title: 'Buscando extrato' },
  { key: 'fetch-autorizacoes', title: 'Buscando autorizações' },
  { key: 'importing', title: 'Salvando registros' },
  { key: 'done', title: 'Concluído' },
]

export function SyncProgressModal({ jobId, onDone, onError }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'running' | 'success' | 'failed'>('running')
  const [result, setResult] = useState<SyncResult | null>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    if (!jobId) return
    doneRef.current = false
    setCurrentStep(0)
    setMessage('')
    setStatus('running')
    setResult(null)

    const interval = setInterval(async () => {
      try {
        const p = await api.integrationLinks.syncProgress(jobId)
        setMessage(p.message)

        const idx = STEPS.findIndex(s => s.key === p.step)
        if (idx >= 0) setCurrentStep(idx)

        if (p.status === 'success') {
          setStatus('success')
          if (p.result !== undefined) setResult(p.result as SyncResult)
          clearInterval(interval)
        } else if (p.status === 'failed') {
          setStatus('failed')
          clearInterval(interval)
          onError(p.message)
        }
      } catch {
        // job not found yet
      }
    }, 800)

    return () => clearInterval(interval)
  }, [jobId])

  const isOpen = !!jobId
  const canClose = status !== 'running'

  return (
    <Modal open={isOpen} footer={null} closable={canClose} onCancel={onDone} width={560} centered maskClosable={canClose}>
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        {status === 'running' && (
          <Spin indicator={<LoadingOutlined style={{ fontSize: 40 }} spin />} />
        )}
        {status === 'success' && <CheckCircleFilled style={{ fontSize: 40, color: '#52c41a' }} />}
        {status === 'failed' && <CloseCircleFilled style={{ fontSize: 40, color: '#ff4d4f' }} />}

        <Title level={4} style={{ marginTop: 16 }}>
          {status === 'running' ? 'Sincronizando...' : status === 'success' ? 'Sincronização concluída' : 'Erro na sincronização'}
        </Title>

        <div style={{ marginTop: 16 }}>
          <Steps
            direction="vertical"
            size="small"
            current={currentStep}
            items={STEPS.map((s, i) => ({
              title: s.title,
              status: i < currentStep ? 'finish' : i === currentStep ? (status === 'failed' ? 'error' : 'process') : 'wait',
            }))}
          />
        </div>

        {message && status !== 'success' && (
          <Text type="secondary" style={{ marginTop: 12, display: 'block' }}>{message}</Text>
        )}

        {status === 'success' && (
          <div style={{ marginTop: 20, textAlign: 'left', background: '#f5f5f5', borderRadius: 8, padding: 16 }}>
            <Text strong>Resumo da sincronização:</Text>
            {result ? (
              <>
                <Descriptions column={1} size="small" style={{ marginTop: 8 }}>
                  <Descriptions.Item label="Exames novos">{result.exams}</Descriptions.Item>
                  <Descriptions.Item label="Consultas novas">{result.medicalRecords}</Descriptions.Item>
                  <Descriptions.Item label="Autorizações novas">{result.authorizations}</Descriptions.Item>
                  <Descriptions.Item label="Autorizações atualizadas">{result.updatedAuthorizations}</Descriptions.Item>
                  <Descriptions.Item label="Itens/procedimentos">{result.authorizationItems}</Descriptions.Item>
                  <Descriptions.Item label="Total alterado"><Text strong>{result.total}</Text></Descriptions.Item>
                </Descriptions>
                {result.authorizationDetails?.length > 0 && (
                  <List
                    size="small"
                    header={<Text strong>Pedidos sincronizados</Text>}
                    style={{ marginTop: 12, background: '#fff', borderRadius: 6, padding: '0 8px' }}
                    dataSource={result.authorizationDetails}
                    renderItem={(d) => (
                      <List.Item>
                        <Space wrap>
                          <Tag color={d.action === 'created' ? 'green' : 'blue'}>
                            {d.action === 'created' ? 'Novo' : 'Atualizado'}
                          </Tag>
                          <Text>{d.solicitationNumber ? `Pedido ${d.solicitationNumber}` : 'Sem número'}</Text>
                          {d.classification && <Text type="secondary">{d.classification}</Text>}
                          {d.doctorName && <Text type="secondary">· {d.doctorName}</Text>}
                          <Tag>{d.itemCount} itens</Tag>
                          {d.linkedConsultaDate && (
                            <Tag color="cyan">Consulta {new Date(d.linkedConsultaDate + 'T12:00:00').toLocaleDateString('pt-BR')}</Tag>
                          )}
                        </Space>
                      </List.Item>
                    )}
                  />
                )}
              </>
            ) : (
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>Carregando...</Text>
            )}
            {result && result.total === 0 && (
              <Text type="warning" style={{ display: 'block', marginTop: 8 }}>Nenhuma alteração encontrada.</Text>
            )}
          </div>
        )}

        {status === 'failed' && message && (
          <Text type="danger" style={{ marginTop: 12, display: 'block' }}>{message}</Text>
        )}

        {canClose && (
          <Space style={{ marginTop: 24 }}>
            <Button type="primary" onClick={onDone}>Fechar</Button>
          </Space>
        )}
      </div>
    </Modal>
  )
}
