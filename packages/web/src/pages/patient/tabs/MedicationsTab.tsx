import { useState } from 'react'
import { Table, Button, Form, DatePicker, Input, Switch, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import type { Medication } from '../../../lib/api.types.js'

interface Props { patientId: string }

export function MedicationsTab({ patientId }: Props) {
  const { t } = useTranslation()
  const { data, loading, reload } = usePatientEntity<Medication>(api.medications.list, patientId)
  const [open, setOpen] = useState(false)

  const columns = [
    { title: t('medication.genericName'), dataIndex: 'genericName' },
    { title: t('medication.dosage'), dataIndex: 'dosage', render: (v: string | null) => v ?? '-' },
    { title: t('medication.frequency'), dataIndex: 'frequency', render: (v: string | null) => v ?? '-' },
    { title: t('medication.startDate'), dataIndex: 'startDate', render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '-' },
    { title: t('medication.endDate'), dataIndex: 'endDate', render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '-' },
    { title: t('medication.doctor'), dataIndex: 'prescribingDoctor', render: (v: string | null) => v ?? '-' },
    { title: t('medication.active'), dataIndex: 'isActive', render: (v: boolean) => v ? <Tag color="green">{t('medication.yes')}</Tag> : <Tag color="red">{t('medication.no')}</Tag> },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('medication.new')}</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} size="small" />
      <EntityFormModal
        open={open}
        title={t('medication.new')}
        successMsg={t('medication.success')}
        onClose={() => setOpen(false)}
        onSubmit={(values) => api.medications.create({
          patientId,
          ...values,
          startDate: (values.startDate as Date | undefined)?.toISOString(),
          endDate: (values.endDate as Date | undefined)?.toISOString(),
        }).then(reload)}
      >
        <Form.Item name="genericName" label={t('medication.genericName')} rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="brandName" label={t('medication.brandName')}><Input /></Form.Item>
        <Form.Item name="dosage" label={t('medication.dosage')}><Input placeholder="250mg" /></Form.Item>
        <Form.Item name="frequency" label={t('medication.frequency')}><Input placeholder="8/8h" /></Form.Item>
        <Form.Item name="route" label={t('medication.route')}><Input placeholder="oral" /></Form.Item>
        <Form.Item name="startDate" label={t('medication.startDate')}><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="endDate" label={t('medication.endDate')}><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="prescribingDoctor" label={t('medication.doctor')}><Input /></Form.Item>
        <Form.Item name="isActive" label={t('medication.active')} valuePropName="checked"><Switch defaultChecked /></Form.Item>
      </EntityFormModal>
    </>
  )
}
