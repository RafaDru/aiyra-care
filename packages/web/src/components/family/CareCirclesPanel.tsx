import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Collapse,
  Form,
  Input,
  List,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import { EditOutlined, LinkOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'

const { Text, Paragraph } = Typography

interface CircleSummary {
  id: string
  name: string
  memberRole?: string
}

interface CircleDetail extends CircleSummary {
  memberRole: string
  members: Array<{ id: string; accountId: string; role: string; email?: string | null; displayName?: string | null }>
  patients: Array<{ patientId: string; patientName: string }>
}

export function CareCirclesPanel() {
  const { t } = useTranslation()
  const [circles, setCircles] = useState<CircleSummary[]>([])
  const [details, setDetails] = useState<Record<string, CircleDetail>>({})
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState<string | null>(null)
  const [linkOpen, setLinkOpen] = useState<string | null>(null)
  const [linkable, setLinkable] = useState<Array<{ id: string; name: string }>>([])
  const [form] = Form.useForm()
  const [renameForm] = Form.useForm()
  const [linkForm] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await api.careCircles.list()
      setCircles(rows)
    } catch {
      message.error(t('family.circles.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const refreshDetail = async (id: string) => {
    const detail = await api.careCircles.get(id)
    setDetails((d) => ({ ...d, [id]: detail }))
    return detail
  }

  const loadDetail = async (id: string) => {
    if (details[id]) return
    try {
      await refreshDetail(id)
    } catch {
      message.error(t('family.circles.loadError'))
    }
  }

  const createCircle = async () => {
    const values = await form.validateFields()
    try {
      await api.careCircles.create(values.name)
      message.success(t('family.circles.created'))
      setCreateOpen(false)
      form.resetFields()
      void load()
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('family.circles.createError'))
    }
  }

  const renameCircle = async () => {
    if (!renameOpen) return
    const values = await renameForm.validateFields()
    try {
      await api.careCircles.update(renameOpen, values.name)
      message.success(t('family.circles.renamed'))
      setRenameOpen(null)
      renameForm.resetFields()
      void load()
      void refreshDetail(renameOpen)
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('family.circles.renameError'))
    }
  }

  const openLinkModal = async (circleId: string) => {
    setLinkOpen(circleId)
    linkForm.resetFields()
    try {
      const rows = await api.careCircles.listLinkablePatients(circleId)
      setLinkable(rows)
    } catch {
      message.error(t('family.circles.loadError'))
      setLinkable([])
    }
  }

  const linkPatient = async () => {
    if (!linkOpen) return
    const values = await linkForm.validateFields()
    try {
      await api.careCircles.linkPatient(linkOpen, values.patientId)
      message.success(t('family.circles.linked'))
      setLinkOpen(null)
      void refreshDetail(linkOpen)
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('family.circles.linkError'))
    }
  }

  const unlinkPatient = async (circleId: string, patientId: string) => {
    try {
      await api.careCircles.unlinkPatient(circleId, patientId)
      message.success(t('family.circles.unlinked'))
      void refreshDetail(circleId)
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('family.circles.unlinkError'))
    }
  }

  const roleLabel = (role: string) => {
    if (role === 'owner') return t('family.circles.roleOwner')
    if (role === 'admin') return t('family.circles.roleAdmin')
    return t('family.circles.roleMember')
  }

  const canManage = (role: string) => role === 'owner' || role === 'admin'

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              <TeamOutlined /> {t('family.circles.title')}
            </Typography.Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {t('family.circles.subtitle')}
            </Paragraph>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            {t('family.circles.create')}
          </Button>
        </div>

        {circles.length === 0 ? (
          <Text type="secondary">{t('family.circles.empty')}</Text>
        ) : (
          <Collapse
            accordion
            onChange={(key) => {
              const id = Array.isArray(key) ? key[0] : key
              if (id) void loadDetail(id)
            }}
            items={circles.map((c) => ({
              key: c.id,
              label: c.name,
              children: details[c.id] ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {canManage(details[c.id].memberRole) && (
                    <Space wrap>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setRenameOpen(c.id)
                          renameForm.setFieldsValue({ name: details[c.id].name })
                        }}
                      >
                        {t('family.circles.rename')}
                      </Button>
                      <Button size="small" icon={<LinkOutlined />} onClick={() => void openLinkModal(c.id)}>
                        {t('family.circles.linkProfile')}
                      </Button>
                    </Space>
                  )}
                  <div>
                    <Text strong>{t('family.circles.profiles')}</Text>
                    <List
                      size="small"
                      dataSource={details[c.id].patients}
                      locale={{ emptyText: t('family.circles.noProfiles') }}
                      renderItem={(p) => (
                        <List.Item
                          actions={
                            canManage(details[c.id].memberRole)
                              ? [
                                  <Button
                                    key="unlink"
                                    type="link"
                                    danger
                                    size="small"
                                    onClick={() => void unlinkPatient(c.id, p.patientId)}
                                  >
                                    {t('family.circles.unlink')}
                                  </Button>,
                                ]
                              : undefined
                          }
                        >
                          {p.patientName}
                        </List.Item>
                      )}
                    />
                  </div>
                  <div>
                    <Text strong>{t('family.circles.members')}</Text>
                    <List
                      size="small"
                      dataSource={details[c.id].members}
                      renderItem={(m) => (
                        <List.Item>
                          <Space>
                            <Text>{m.displayName ?? m.email ?? m.accountId.slice(0, 8)}</Text>
                            <Tag>{roleLabel(m.role)}</Tag>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </div>
                  <Text type="secondary">{t('family.circles.yourRole', { role: roleLabel(details[c.id].memberRole) })}</Text>
                </Space>
              ) : (
                <Text type="secondary">{t('family.circles.loadingDetail')}</Text>
              ),
            }))}
          />
        )}
      </Space>

      <Modal
        open={createOpen}
        title={t('family.circles.modalTitle')}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void createCircle()}
        okText={t('family.circles.create')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t('family.circles.nameLabel')}
            rules={[{ required: true, message: t('family.circles.nameRequired') }]}
          >
            <Input placeholder={t('family.circles.namePlaceholder')} maxLength={120} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={renameOpen !== null}
        title={t('family.circles.renameTitle')}
        onCancel={() => setRenameOpen(null)}
        onOk={() => void renameCircle()}
        okText={t('common.save')}
      >
        <Form form={renameForm} layout="vertical">
          <Form.Item
            name="name"
            label={t('family.circles.nameLabel')}
            rules={[{ required: true, message: t('family.circles.nameRequired') }]}
          >
            <Input maxLength={120} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={linkOpen !== null}
        title={t('family.circles.linkTitle')}
        onCancel={() => setLinkOpen(null)}
        onOk={() => void linkPatient()}
        okText={t('family.circles.linkProfile')}
        okButtonProps={{ disabled: linkable.length === 0 }}
      >
        {linkable.length === 0 ? (
          <Text type="secondary">{t('family.circles.noLinkable')}</Text>
        ) : (
          <Form form={linkForm} layout="vertical">
            <Form.Item
              name="patientId"
              label={t('family.circles.profiles')}
              rules={[{ required: true, message: t('family.circles.linkRequired') }]}
            >
              <Select
                options={linkable.map((p) => ({ value: p.id, label: p.name }))}
                placeholder={t('family.invite.profilesPlaceholder')}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </Card>
  )
}
