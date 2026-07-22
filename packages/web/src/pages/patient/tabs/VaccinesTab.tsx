import { useState } from 'react'
import { Table, Button, Form, DatePicker, Input, InputNumber, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import type { Vaccine } from '../../../lib/api.types.js'

interface Props { patientId: string }

export function VaccinesTab({ patientId }: Props) {
  const { t } = useTranslation()
  const { data, loading, reload } = usePatientEntity<Vaccine>(api.vaccines.list, patientId)
  const [open, setOpen] = useState(false)

  const columns = [
    { title: t('vaccine.name'), dataIndex: 'vaccineName' },
    { title: t('vaccine.dose'), dataIndex: 'doseNumber', render: (v: number | null) => v ? `${v}ª` : '-' },
    { title: t('vaccine.applicationDate'), dataIndex: 'applicationDate', render: (v: string) => new Date(v).toLocaleDateString() },
    { title: t('vaccine.nextDose'), dataIndex: 'nextDoseDate', render: (v: string | null) => v ? <Tag color="orange">{new Date(v).toLocaleDateString()}</Tag> : '-' },
    { title: t('vaccine.appliedBy'), dataIndex: 'appliedBy', render: (v: string | null) => v ?? '-' },
    { title: t('vaccine.batch'), dataIndex: 'batchNumber', render: (v: string | null) => v ?? '-' },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('vaccine.new')}</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} size="small" />
      <EntityFormModal
        open={open}
        title={t('vaccine.new')}
        successMsg={t('vaccine.success')}
        onClose={() => setOpen(false)}
        onSubmit={(values) => api.vaccines.create({
          patientId,
          ...values,
          applicationDate: (values.applicationDate as Date).toISOString(),
          nextDoseDate: (values.nextDoseDate as Date | undefined)?.toISOString(),
        }).then(reload)}
      >
        <Form.Item name="vaccineName" label={t('vaccine.name')} rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="doseNumber" label={t('vaccine.dose')}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="applicationDate" label={t('vaccine.applicationDate')} rules={[{ required: true, type: 'date' as const }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="nextDoseDate" label={t('vaccine.nextDose')}><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="batchNumber" label={t('vaccine.batch')}><Input /></Form.Item>
        <Form.Item name="appliedBy" label={t('vaccine.appliedBy')}><Input /></Form.Item>
        <Form.Item name="clinic" label={t('vaccine.clinic')}><Input /></Form.Item>
      </EntityFormModal>
    </>
  )
}
