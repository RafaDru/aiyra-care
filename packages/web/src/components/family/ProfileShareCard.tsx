import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { ShareAltOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'

const { Text, Paragraph } = Typography

interface ProfileShare {
  id: string
  patientId: string
  patientName: string
  ownerDisplayName?: string | null
  targetAccountEmail: string
  targetCircleId?: string | null
  targetCircleName?: string | null
  status: string
  expiresAt: string
}

interface OwnedPatient {
  id: string
  name: string
}

interface ManageableCircle {
  id: string
  name: string
  memberRole?: string
}

export function ProfileShareCard() {
  const { t } = useTranslation()
  const [sent, setSent] = useState<ProfileShare[]>([])
  const [incoming, setIncoming] = useState<ProfileShare[]>([])
  const [ownedPatients, setOwnedPatients] = useState<OwnedPatient[]>([])
  const [circles, setCircles] = useState<ManageableCircle[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [acceptOpen, setAcceptOpen] = useState<ProfileShare | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const [acceptForm] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sentRows, incomingRows, circleRows, owned] = await Promise.all([
        api.familyAccess.listProfileSharesSent(),
        api.familyAccess.listProfileSharesIncoming(),
        api.careCircles.list(),
        api.familyAccess.listOwnedPatients(),
      ])
      setSent(sentRows)
      setIncoming(incomingRows)
      setOwnedPatients(owned)
      setCircles(circleRows.filter((c) => c.memberRole === 'owner' || c.memberRole === 'admin'))
    } catch {
      message.error(t('family.profileShare.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async () => {
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      await api.familyAccess.createProfileShare({
        patientId: values.patientId,
        targetAccountEmail: values.targetAccountEmail,
        legitimacyAck: values.legitimacyAck,
      })
      message.success(t('family.profileShare.sent'))
      setModalOpen(false)
      form.resetFields()
      void load()
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('family.profileShare.sendError'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleAccept = async () => {
    if (!acceptOpen) return
    const values = await acceptForm.validateFields()
    setSubmitting(true)
    try {
      await api.familyAccess.acceptProfileShare({
        inviteId: acceptOpen.id,
        circleId: values.circleId,
      })
      message.success(t('family.profileShare.accepted'))
      setAcceptOpen(null)
      acceptForm.resetFields()
      void load()
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('family.profileShare.acceptError'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecline = async (id: string) => {
    try {
      await api.familyAccess.declineProfileShare(id)
      message.success(t('family.profileShare.declined'))
      void load()
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('family.profileShare.declineError'))
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      await api.familyAccess.revokeProfileShare(id)
      message.success(t('family.profileShare.revoked'))
      void load()
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('family.profileShare.revokeError'))
    }
  }

  const statusTag = (status: string) => {
    const color =
      status === 'accepted' ? 'green'
        : status === 'pending' ? 'blue'
          : status === 'declined' ? 'default'
            : 'red'
    return <Tag color={color}>{t(`family.profileShare.status.${status}`, status)}</Tag>
  }

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              <ShareAltOutlined /> {t('family.profileShare.title')}
            </Typography.Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {t('family.profileShare.subtitle')}
            </Paragraph>
          </div>
          <Button
            type="default"
            icon={<ShareAltOutlined />}
            onClick={() => setModalOpen(true)}
            disabled={ownedPatients.length === 0}
          >
            {t('family.profileShare.create')}
          </Button>
        </div>

        {incoming.length > 0 && (
          <>
            <Alert type="info" showIcon message={t('family.profileShare.incomingHint')} />
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={incoming}
              columns={[
                { title: t('family.profileShare.patient'), dataIndex: 'patientName' },
                { title: t('family.profileShare.from'), key: 'from', render: (_, r) => r.ownerDisplayName ?? '—' },
                { title: t('family.profileShare.status'), key: 'status', render: (_, r) => statusTag(r.status) },
                {
                  title: t('common.actions'),
                  key: 'actions',
                  render: (_, r) => (
                    <Space>
                      <Button size="small" type="primary" onClick={() => setAcceptOpen(r)}>
                        {t('family.profileShare.accept')}
                      </Button>
                      <Button size="small" onClick={() => void handleDecline(r.id)}>
                        {t('family.profileShare.decline')}
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
          </>
        )}

        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={sent}
          locale={{ emptyText: t('family.profileShare.emptySent') }}
          columns={[
            { title: t('family.profileShare.patient'), dataIndex: 'patientName' },
            { title: t('family.profileShare.to'), dataIndex: 'targetAccountEmail' },
            {
              title: t('family.profileShare.circle'),
              key: 'circle',
              render: (_, r) => r.targetCircleName ?? '—',
            },
            { title: t('family.profileShare.status'), key: 'status', render: (_, r) => statusTag(r.status) },
            {
              title: t('common.actions'),
              key: 'actions',
              render: (_, r) =>
                r.status === 'pending' || r.status === 'accepted' ? (
                  <Button type="link" danger size="small" onClick={() => void handleRevoke(r.id)}>
                    {t('family.profileShare.revoke')}
                  </Button>
                ) : null,
            },
          ]}
        />
      </Space>

      <Modal
        open={modalOpen}
        title={t('family.profileShare.modalTitle')}
        onCancel={() => setModalOpen(false)}
        onOk={() => void handleCreate()}
        confirmLoading={submitting}
        okText={t('family.profileShare.send')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="patientId"
            label={t('family.profileShare.patient')}
            rules={[{ required: true, message: t('family.profileShare.patientRequired') }]}
          >
            <Select
              options={ownedPatients.map((p) => ({ value: p.id, label: p.name }))}
              placeholder={t('family.invite.profilesPlaceholder')}
            />
          </Form.Item>
          <Form.Item
            name="targetAccountEmail"
            label={t('family.profileShare.targetEmail')}
            rules={[
              { required: true, message: t('family.invite.emailRequired') },
              { type: 'email', message: t('family.invite.emailInvalid') },
            ]}
          >
            <Input placeholder="email@exemplo.com" />
          </Form.Item>
          <Form.Item
            name="legitimacyAck"
            valuePropName="checked"
            rules={[
              {
                validator: (_, v) =>
                  v ? Promise.resolve() : Promise.reject(new Error(t('family.profileShare.legitimacyRequired'))),
              },
            ]}
          >
            <Checkbox>{t('family.profileShare.legitimacy')}</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={acceptOpen !== null}
        title={t('family.profileShare.acceptTitle')}
        onCancel={() => setAcceptOpen(null)}
        onOk={() => void handleAccept()}
        confirmLoading={submitting}
        okText={t('family.profileShare.accept')}
      >
        {acceptOpen && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>
              {t('family.profileShare.acceptBody', {
                patient: acceptOpen.patientName,
              })}
            </Text>
            <Form form={acceptForm} layout="vertical">
              <Form.Item
                name="circleId"
                label={t('family.profileShare.chooseCircle')}
                rules={[{ required: true, message: t('family.profileShare.circleRequired') }]}
              >
                <Select
                  options={circles.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder={t('family.invite.circlePlaceholder')}
                />
              </Form.Item>
            </Form>
          </Space>
        )}
      </Modal>
    </Card>
  )
}
