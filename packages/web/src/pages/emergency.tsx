import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Alert, Button, Card, Col, Collapse, Form, Input, Modal, Row, Select, Space, Tag, Typography, App,
} from 'antd'
import {
  PhoneOutlined, PlusOutlined, DeleteOutlined, EditOutlined, AlertOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api.js'
import type { EmergencyDirectoryEntry, Patient, PatientEmergencyContact } from '../lib/api.types.js'
import { PageHeader } from '../components/ui/PageHeader.js'
import { DismissibleHint } from '../components/ui/DismissibleHint.js'

const QUICK_IDS = ['samu_192', 'bombeiros_193', 'pm_190', 'cvv_188'] as const

const CATEGORY_ORDER: EmergencyDirectoryEntry['category'][] = [
  'medical', 'fire_rescue', 'police', 'poison', 'venomous_animal',
  'mental_health', 'violence_support', 'human_rights', 'civil_defense', 'other',
]

function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  if (digits.startsWith('0800')) return `tel:${digits}`
  const only = digits.replace(/\D/g, '')
  return `tel:${only}`
}

export function EmergencyPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const patientIdParam = searchParams.get('patientId') ?? undefined

  const [patients, setPatients] = useState<Patient[]>([])
  const [patientId, setPatientId] = useState<string | undefined>(patientIdParam)
  const [directory, setDirectory] = useState<EmergencyDirectoryEntry[]>([])
  const [contacts, setContacts] = useState<PatientEmergencyContact[]>([])
  const [stateCode, setStateCode] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [contactModal, setContactModal] = useState(false)
  const [editing, setEditing] = useState<PatientEmergencyContact | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    api.patients.list().then(setPatients).catch(() => setPatients([]))
  }, [])

  const loadDirectory = useCallback(() => {
    return api.emergency.directory({ stateCode }).then(setDirectory).catch(() => setDirectory([]))
  }, [stateCode])

  const loadContacts = useCallback(() => {
    if (!patientId) {
      setContacts([])
      return Promise.resolve()
    }
    return api.emergency.contacts(patientId).then(setContacts).catch(() => setContacts([]))
  }, [patientId])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadDirectory(), loadContacts()]).finally(() => setLoading(false))
  }, [loadDirectory, loadContacts])

  useEffect(() => {
    if (patientId) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('patientId', patientId)
        return next
      }, { replace: true })
    }
  }, [patientId, setSearchParams])

  const quickEntries = useMemo(() => {
    const map = new Map(directory.map((d) => [d.id, d]))
    return QUICK_IDS.map((id) => map.get(id)).filter(Boolean) as EmergencyDirectoryEntry[]
  }, [directory])

  const grouped = useMemo(() => {
    const groups = new Map<string, EmergencyDirectoryEntry[]>()
    for (const entry of directory) {
      const list = groups.get(entry.category) ?? []
      list.push(entry)
      groups.set(entry.category, list)
    }
    return CATEGORY_ORDER
      .filter((c) => groups.has(c))
      .map((category) => ({
        category,
        items: groups.get(category) ?? [],
      }))
  }, [directory])

  const openCreateContact = () => {
    setEditing(null)
    form.resetFields()
    setContactModal(true)
  }

  const openEditContact = (c: PatientEmergencyContact) => {
    setEditing(c)
    form.setFieldsValue({
      name: c.name,
      phone: c.phone,
      phoneAlt: c.phoneAlt,
      relationship: c.relationship,
      notes: c.notes,
    })
    setContactModal(true)
  }

  const saveContact = async () => {
    if (!patientId) return
    const values = await form.validateFields()
    try {
      if (editing) {
        await api.emergency.updateContact(editing.id, values)
        message.success(t('emergency.contactUpdated'))
      } else {
        await api.emergency.createContact({ ...values, patientId })
        message.success(t('emergency.contactCreated'))
      }
      setContactModal(false)
      loadContacts()
    } catch {
      message.error(t('emergency.error'))
    }
  }

  const removeContact = async (id: string) => {
    try {
      await api.emergency.deleteContact(id)
      message.success(t('emergency.contactRemoved'))
      loadContacts()
    } catch {
      message.error(t('emergency.error'))
    }
  }

  return (
    <>
      <PageHeader title={t('emergency.title')} subtitle={t('emergency.subtitle')} />

      <DismissibleHint
        hintId="emergency.disclaimer"
        type="warning"
        showIcon
        icon={<AlertOutlined />}
        acknowledge={false}
        message={t('emergency.disclaimer')}
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {quickEntries.map((entry) => (
          <Col xs={12} sm={6} key={entry.id}>
            <Button
              type="primary"
              danger={entry.id === 'samu_192'}
              block
              size="large"
              icon={<PhoneOutlined />}
              href={telHref(entry.phone)}
              style={{ height: 56, fontWeight: 600 }}
            >
              {entry.phone}
              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.9 }}>
                {entry.name.split('—')[0].trim()}
              </div>
            </Button>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title={t('emergency.officialDirectory')} loading={loading}>
            <Space style={{ marginBottom: 16 }} wrap>
              <Select
                allowClear
                placeholder={t('emergency.filterState')}
                style={{ minWidth: 120 }}
                value={stateCode}
                onChange={(v) => setStateCode(v)}
                options={[
                  { value: 'SP', label: 'SP' },
                  { value: 'RJ', label: 'RJ' },
                  { value: 'MG', label: 'MG' },
                  { value: 'RS', label: 'RS' },
                  { value: 'BA', label: 'BA' },
                ]}
              />
              <Typography.Text type="secondary">{t('emergency.stateHint')}</Typography.Text>
            </Space>
            <Collapse
              items={grouped.map((g) => ({
                key: g.category,
                label: t(`emergency.category.${g.category}`),
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {g.items.map((item) => (
                      <Card key={item.id} size="small" type="inner">
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Space wrap>
                            <Typography.Text strong>{item.name}</Typography.Text>
                            {item.available24h && <Tag color="blue">{t('emergency.available24h')}</Tag>}
                            {item.scope !== 'national' && (
                              <Tag>{item.stateCode ?? item.scope}</Tag>
                            )}
                          </Space>
                          <Space>
                            <Button type="primary" icon={<PhoneOutlined />} href={telHref(item.phone)}>
                              {item.phone}
                            </Button>
                            {item.phoneAlt && (
                              <Button icon={<PhoneOutlined />} href={telHref(item.phoneAlt)}>
                                {item.phoneAlt}
                              </Button>
                            )}
                          </Space>
                          {item.description && (
                            <Typography.Text type="secondary">{item.description}</Typography.Text>
                          )}
                          {item.instructions && (
                            <Typography.Text>{item.instructions}</Typography.Text>
                          )}
                          {item.officialOrg && (
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              {item.officialOrg}
                              {item.sourceUrl && (
                                <> — <a href={item.sourceUrl} target="_blank" rel="noreferrer">{t('emergency.source')}</a></>
                              )}
                            </Typography.Text>
                          )}
                        </Space>
                      </Card>
                    ))}
                  </Space>
                ),
              }))}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={t('emergency.patientContacts')}
            extra={
              patientId ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateContact}>
                  {t('emergency.addContact')}
                </Button>
              ) : null
            }
            loading={loading}
          >
            <Select
              allowClear
              showSearch
              placeholder={t('emergency.selectPatient')}
              style={{ width: '100%', marginBottom: 16 }}
              value={patientId}
              onChange={(v) => setPatientId(v)}
              options={patients.map((p) => ({ value: p.id, label: p.name }))}
              optionFilterProp="label"
            />
            {!patientId && (
              <Typography.Text type="secondary">{t('emergency.selectPatientHint')}</Typography.Text>
            )}
            {patientId && contacts.length === 0 && (
              <Typography.Text type="secondary">{t('emergency.noContacts')}</Typography.Text>
            )}
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {contacts.map((c) => (
                <Card key={c.id} size="small">
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Typography.Text strong>{c.name}</Typography.Text>
                    {c.relationship && <Tag>{c.relationship}</Tag>}
                    <Button type="primary" icon={<PhoneOutlined />} href={telHref(c.phone)}>
                      {c.phone}
                    </Button>
                    {c.notes && <Typography.Text type="secondary">{c.notes}</Typography.Text>}
                    <Space>
                      <Button size="small" icon={<EditOutlined />} onClick={() => openEditContact(c)} />
                      <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeContact(c.id)} />
                    </Space>
                  </Space>
                </Card>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal
        open={contactModal}
        title={editing ? t('emergency.editContact') : t('emergency.addContact')}
        onCancel={() => setContactModal(false)}
        onOk={saveContact}
        okText={t('emergency.save')}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('emergency.contactName')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label={t('emergency.contactPhone')} rules={[{ required: true }]}>
            <Input placeholder="(31) 99999-9999" />
          </Form.Item>
          <Form.Item name="phoneAlt" label={t('emergency.contactPhoneAlt')}>
            <Input />
          </Form.Item>
          <Form.Item name="relationship" label={t('emergency.contactRelationship')}>
            <Input placeholder={t('emergency.relationshipPlaceholder')} />
          </Form.Item>
          <Form.Item name="notes" label={t('growth.notes')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
