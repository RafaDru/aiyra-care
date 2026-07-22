import { useState } from 'react'
import { Table, Button, Form, Input, Switch, DatePicker, Select, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import type { Diagnosis } from '../../../lib/api.types.js'

interface Props { patientId: string }

const statusColors: Record<string, string> = { active: 'red', resolved: 'green', monitoring: 'orange' }

export function DiagnosesTab({ patientId }: Props) {
  const { t } = useTranslation()
  const { data, loading, reload } = usePatientEntity<Diagnosis>(api.diagnoses.list, patientId)
  const [open, setOpen] = useState(false)

  const columns = [
    { title: t('diagnosis.name'), dataIndex: 'diagnosisName' },
    { title: t('diagnosis.code'), dataIndex: 'diagnosisCode', render: (v: string | null) => v ? <Tag>{v}</Tag> : '-' },
    { title: t('diagnosis.chronic'), dataIndex: 'isChronic', render: (v: boolean) =>
      v ? <Tag color="red">{t('medication.yes')}</Tag> : <Tag color="green">{t('medication.no')}</Tag> },
    { title: t('diagnosis.date'), dataIndex: 'diagnosedDate', render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '-' },
    { title: t('diagnosis.status'), dataIndex: 'status', render: (v: string | null) =>
      v ? <Tag color={statusColors[v] || 'default'}>{t(`diagnosis.${v}`)}</Tag> : '-' },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('diagnosis.new')}</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} size="small" />
      <EntityFormModal
        open={open}
        title={t('diagnosis.new')}
        successMsg={t('diagnosis.success')}
        onClose={() => setOpen(false)}
        onSubmit={(values) => api.diagnoses.create({
          patientId,
          ...values,
          diagnosedDate: (values.diagnosedDate as Date | undefined)?.toISOString(),
        }).then(reload)}
      >
        <Form.Item name="diagnosisName" label={t('diagnosis.name')} rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="diagnosisCode" label={t('diagnosis.code')}><Input placeholder="H66.9" /></Form.Item>
        <Form.Item name="description" label={t('medicalRecord.description')}><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="isChronic" label={t('diagnosis.chronic')} valuePropName="checked"><Switch /></Form.Item>
        <Form.Item name="diagnosedDate" label={t('diagnosis.date')}><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="status" label={t('diagnosis.status')}>
          <Select options={[
            { value: 'active', label: t('diagnosis.active') },
            { value: 'resolved', label: t('diagnosis.resolved') },
            { value: 'monitoring', label: t('diagnosis.monitoring') },
          ]} />
        </Form.Item>
      </EntityFormModal>
    </>
  )
}
