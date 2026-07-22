import { useState } from 'react'
import { Table, Button, Form, DatePicker, InputNumber, Input } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import type { GrowthRecord } from '../../../lib/api.types.js'

interface Props { patientId: string }

export function GrowthTab({ patientId }: Props) {
  const { t } = useTranslation()
  const { data, loading, reload } = usePatientEntity<GrowthRecord>(api.growthRecords.list, patientId)
  const [open, setOpen] = useState(false)

  const columns = [
    { title: t('growth.date'), dataIndex: 'recordDate', render: (v: string) => new Date(v).toLocaleDateString() },
    { title: t('growth.weight'), dataIndex: 'weightKg', render: (v: number | null) => v ?? '-' },
    { title: t('growth.height'), dataIndex: 'heightCm', render: (v: number | null) => v ?? '-' },
    { title: t('growth.headCircumference'), dataIndex: 'headCircumferenceCm', render: (v: number | null) => v ?? '-' },
    { title: t('growth.bmi'), dataIndex: 'bmi', render: (v: number | null) => v?.toFixed(1) ?? '-' },
    { title: t('growth.percentileWeight'), dataIndex: 'percentileWeight', render: (v: number | null) => v ?? '-' },
    { title: t('growth.percentileHeight'), dataIndex: 'percentileHeight', render: (v: number | null) => v ?? '-' },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('growth.new')}</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} size="small" />
      <EntityFormModal
        open={open}
        title={t('growth.new')}
        successMsg={t('growth.success')}
        onClose={() => setOpen(false)}
        onSubmit={(values) => api.growthRecords.create({ patientId, ...values, recordDate: (values.recordDate as Date).toISOString() }).then(reload)}
      >
        <Form.Item name="recordDate" label={t('growth.date')} rules={[{ required: true, type: 'date' as const }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="weightKg" label={t('growth.weight')}><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="heightCm" label={t('growth.height')}><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="headCircumferenceCm" label={t('growth.headCircumference')}><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="notes" label={t('growth.notes')}><Input.TextArea rows={2} /></Form.Item>
      </EntityFormModal>
    </>
  )
}
