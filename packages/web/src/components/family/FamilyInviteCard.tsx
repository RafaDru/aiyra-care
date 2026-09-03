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
import { PlusOutlined, UserAddOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'

const { Text, Paragraph } = Typography

interface OwnedPatient {
  id: string
  name: string
}

interface FamilyInvite {
  id: string
  inviteeEmail: string
  patientIds: string[]
  accessLevel: string
  status: string
  expiresAt: string
}

export function FamilyInviteCard() {
  const { t } = useTranslation()
  const [invites, setInvites] = useState<FamilyInvite[]>([])
  const [ownedPatients, setOwnedPatients] = useState<OwnedPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastAcceptUrl, setLastAcceptUrl] = useState<string | null>(null)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [inv, owned] = await Promise.all([
        api.familyAccess.listInvites(),
        api.familyAccess.listOwnedPatients(),
      ])
      setInvites(inv)
      setOwnedPatients(owned)
    } catch {
      message.error(t('family.invite.loadError'))
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
      const result = await api.familyAccess.createInvite({
        inviteeEmail: values.email,
        patientIds: values.patientIds,
        accessLevel: values.accessLevel ?? 'full',
        legitimacyAck: true,
      })
      setLastAcceptUrl(result.acceptUrl)
      message.success(t('family.invite.created'))
      setModalOpen(false)
      form.resetFields()
      void load()
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('family.invite.createError'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      await api.familyAccess.revokeInvite(id)
      message.success(t('family.invite.revoked'))
      void load()
    } catch {
      message.error(t('family.invite.revokeError'))
    }
  }

  const patientName = (id: string) => ownedPatients.find((p) => p.id === id)?.name ?? id.slice(0, 8)

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              <UserAddOutlined /> {t('family.invite.title')}
            </Typography.Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {t('family.invite.subtitle')}
            </Paragraph>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            disabled={ownedPatients.length === 0}
          >
            {t('family.invite.action')}
          </Button>
        </div>

        {ownedPatients.length === 0 && !loading && (
          <Alert type="info" showIcon message={t('family.invite.noOwnedPatients')} />
        )}

        {lastAcceptUrl && (
          <Alert
            type="success"
            showIcon
            message={t('family.invite.linkReady')}
            description={
              <Text copyable={{ text: lastAcceptUrl }} style={{ wordBreak: 'break-all' }}>
                {lastAcceptUrl}
              </Text>
            }
            closable
            onClose={() => setLastAcceptUrl(null)}
          />
        )}

        <Table
          size="small"
          loading={loading}
          rowKey="id"
          pagination={false}
          dataSource={invites}
          locale={{ emptyText: t('family.invite.empty') }}
          columns={[
            { title: t('family.invite.colEmail'), dataIndex: 'inviteeEmail' },
            {
              title: t('family.invite.colProfiles'),
              render: (_, row) => row.patientIds.map((id) => (
                <Tag key={id}>{patientName(id)}</Tag>
              )),
            },
            {
              title: t('family.invite.colStatus'),
              dataIndex: 'status',
              render: (s: string) => <Tag>{s}</Tag>,
            },
            {
              title: '',
              render: (_, row) =>
                row.status === 'pending' ? (
                  <Button type="link" danger size="small" onClick={() => void handleRevoke(row.id)}>
                    {t('family.invite.revoke')}
                  </Button>
                ) : null,
            },
          ]}
        />
      </Space>

      <Modal
        open={modalOpen}
        title={t('family.invite.modalTitle')}
        onCancel={() => setModalOpen(false)}
        onOk={() => void handleCreate()}
        confirmLoading={submitting}
        okText={t('family.invite.send')}
      >
        <Form form={form} layout="vertical" initialValues={{ accessLevel: 'full' }}>
          <Form.Item
            name="email"
            label={t('family.invite.emailLabel')}
            rules={[{ required: true, type: 'email' }]}
          >
            <Input placeholder="cuidador@email.com" />
          </Form.Item>
          <Form.Item
            name="patientIds"
            label={t('family.invite.profilesLabel')}
            rules={[{ required: true, message: t('family.invite.profilesRequired') }]}
          >
            <Select
              mode="multiple"
              options={ownedPatients.map((p) => ({ value: p.id, label: p.name }))}
              placeholder={t('family.invite.profilesPlaceholder')}
            />
          </Form.Item>
          <Form.Item name="accessLevel" label={t('family.invite.accessLabel')}>
            <Select
              options={[
                { value: 'full', label: t('family.invite.accessFull') },
                { value: 'read_only', label: t('family.invite.accessReadOnly') },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="legitimacyAck"
            valuePropName="checked"
            rules={[
              {
                validator: (_, v) =>
                  v ? Promise.resolve() : Promise.reject(new Error(t('family.invite.legitimacyRequired'))),
              },
            ]}
          >
            <Checkbox>{t('family.invite.legitimacyLabel')}</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
