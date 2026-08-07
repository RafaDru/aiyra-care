import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Dropdown,
  Empty,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  MoreOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { api } from '../../lib/api.js'
import type { HealthThread, HealthThreadKind } from '../../lib/api.types.js'
import { InvestigationWizardModal } from './InvestigationWizardModal.js'
import { TaskWizardModal } from './TaskWizardModal.js'
import { HealthThreadDrawer } from './HealthThreadDrawer.js'
import {
  HEALTH_THREAD_KIND_META,
  HEALTH_THREAD_STATUS_LABEL,
} from './health-thread-kinds.js'

const { Text } = Typography

interface HealthThreadsPanelProps {
  patientId: string
  layout?: 'default' | 'sidebar'
}

export function HealthThreadsPanel({ patientId, layout = 'default' }: HealthThreadsPanelProps) {
  const isSidebar = layout === 'sidebar'
  const [threads, setThreads] = useState<HealthThread[]>([])
  const [loading, setLoading] = useState(true)
  const [accompanimentOpen, setAccompanimentOpen] = useState(false)
  const [investigationOpen, setInvestigationOpen] = useState(false)
  const [drawerThreadId, setDrawerThreadId] = useState<string | null>(null)
  const [quickKind, setQuickKind] = useState<HealthThreadKind | null>(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [quickSubmitting, setQuickSubmitting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.healthThreads
      .list(patientId, true)
      .then(setThreads)
      .catch(() => message.error('Não foi possível carregar itens em acompanhamento'))
      .finally(() => setLoading(false))
  }, [patientId])

  useEffect(() => {
    load()
  }, [load])

  const handleQuickAdd = async () => {
    if (!quickKind) return
    const trimmed = quickTitle.trim()
    if (!trimmed) return
    setQuickSubmitting(true)
    try {
      await api.healthThreads.create({
        patientId,
        kind: quickKind,
        title: trimmed,
        status: 'active',
        confidence: quickKind === 'hypothesis' ? 'low' : undefined,
      })
      setQuickTitle('')
      setQuickKind(null)
      message.success('Registro salvo')
      load()
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setQuickSubmitting(false)
    }
  }

  const handleClose = async (id: string, status: 'resolved' | 'ruled_out') => {
    try {
      await api.healthThreads.close(id, status)
      message.success(status === 'resolved' ? 'Marcado como concluído' : 'Marcado como descartado')
      load()
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Erro ao atualizar')
    }
  }

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Remover este item?',
      okText: 'Remover',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        await api.healthThreads.delete(id)
        message.success('Removido')
        load()
      },
    })
  }

  const openDrawer = (thread: HealthThread) => {
    setDrawerThreadId(thread.id)
  }

  const addMenuItems: MenuProps['items'] = [
    {
      key: 'accompaniment',
      label: 'Plano de acompanhamento',
      onClick: () => setAccompanimentOpen(true),
    },
    {
      key: 'investigation',
      label: 'Investigação',
      onClick: () => setInvestigationOpen(true),
    },
    { type: 'divider' },
    {
      key: 'hypothesis',
      label: 'Hipótese (registro rápido)',
      onClick: () => setQuickKind('hypothesis'),
    },
    {
      key: 'episode',
      label: 'Episódio (registro rápido)',
      onClick: () => setQuickKind('episode'),
    },
  ]

  const quickKindLabel =
    quickKind === 'hypothesis' ? 'Hipótese' : quickKind === 'episode' ? 'Episódio' : ''

  return (
    <>
      <Card
        title="Em acompanhamento"
        size="small"
        className={isSidebar ? 'health-threads-panel--sidebar' : undefined}
        style={{ marginBottom: isSidebar ? 0 : 16 }}
        loading={loading}
        extra={
          threads.length > 0 ? (
            <Text type="secondary" style={{ fontSize: isSidebar ? 11 : 12 }}>
              {threads.length} {threads.length === 1 ? 'item' : 'itens'}
            </Text>
          ) : null
        }
      >
        <Dropdown menu={{ items: addMenuItems }} trigger={['click']}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block={isSidebar}
            size={isSidebar ? 'small' : 'middle'}
            style={{ marginBottom: 12 }}
          >
            Adicionar
          </Button>
        </Dropdown>

        {threads.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Nenhum plano de acompanhamento ou investigação aberto."
            style={{ margin: '8px 0' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {threads.map((thread) => {
              const meta = HEALTH_THREAD_KIND_META[thread.kind]
              return (
                <div
                  key={thread.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border, #E2E8F0)',
                    background: 'linear-gradient(90deg, rgba(147, 51, 234, 0.04) 0%, transparent 100%)',
                    cursor: 'pointer',
                  }}
                  onClick={() => openDrawer(thread)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Space size={6} wrap style={{ marginBottom: 4 }}>
                      <Tag color={meta.color} style={{ margin: 0, border: 'none' }}>
                        {meta.shortLabel}
                      </Tag>
                      {thread.confidence && thread.kind === 'hypothesis' && (
                        <Tag style={{ margin: 0 }}>
                          confiança{' '}
                          {thread.confidence === 'low'
                            ? 'baixa'
                            : thread.confidence === 'medium'
                              ? 'média'
                              : 'alta'}
                        </Tag>
                      )}
                      <Tag style={{ margin: 0 }}>
                        {HEALTH_THREAD_STATUS_LABEL[thread.status] ?? thread.status}
                      </Tag>
                    </Space>
                    <Text
                      strong
                      style={{ display: 'block', lineHeight: 1.35, fontSize: isSidebar ? 13 : 14 }}
                    >
                      {thread.title}
                    </Text>
                    {thread.summary && (
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                        {thread.summary}
                      </Text>
                    )}
                    {thread.kind === 'investigation' || thread.kind === 'task' ? (
                      <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
                        Clique para abrir o workflow
                      </Text>
                    ) : null}
                  </div>
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'open',
                          label: 'Abrir detalhes',
                          onClick: () => openDrawer(thread),
                        },
                        {
                          key: 'resolve',
                          label: 'Concluir',
                          icon: <CheckOutlined />,
                          onClick: () => handleClose(thread.id, 'resolved'),
                        },
                        {
                          key: 'ruleout',
                          label: 'Descartar',
                          icon: <CloseOutlined />,
                          onClick: () => handleClose(thread.id, 'ruled_out'),
                        },
                        {
                          key: 'delete',
                          label: 'Remover',
                          danger: true,
                          onClick: () => handleDelete(thread.id),
                        },
                      ],
                    }}
                    trigger={['click']}
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<MoreOutlined />}
                      aria-label="Ações"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal
        open={quickKind != null}
        title={`Registro rápido — ${quickKindLabel}`}
        okText="Salvar"
        cancelText="Cancelar"
        confirmLoading={quickSubmitting}
        onCancel={() => {
          setQuickKind(null)
          setQuickTitle('')
        }}
        onOk={() => handleQuickAdd()}
        destroyOnClose
      >
        <Input
          placeholder={
            quickKind === 'hypothesis'
              ? 'Ex.: Suspeita de alergia a amendoim'
              : 'Ex.: Febre e tosse desde ontem'
          }
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onPressEnter={() => handleQuickAdd()}
          maxLength={500}
        />
      </Modal>

      <InvestigationWizardModal
        open={investigationOpen}
        patientId={patientId}
        onClose={() => setInvestigationOpen(false)}
        onCreated={(t) => {
          message.success('Investigação aberta')
          load()
          setDrawerThreadId(t.id)
        }}
      />

      <TaskWizardModal
        open={accompanimentOpen}
        patientId={patientId}
        onClose={() => setAccompanimentOpen(false)}
        onCreated={(t) => {
          message.success('Plano de acompanhamento registrado')
          load()
          setDrawerThreadId(t.id)
        }}
      />

      <HealthThreadDrawer
        threadId={drawerThreadId}
        patientId={patientId}
        open={drawerThreadId != null}
        onClose={() => setDrawerThreadId(null)}
        onUpdated={load}
      />
    </>
  )
}
