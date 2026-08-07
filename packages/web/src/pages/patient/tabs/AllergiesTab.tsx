import { useState } from 'react'
import { Table, Button, Form, Input, Select, Tag } from 'antd'
import { MaskedDatePicker } from '../../../components/ui/MaskedDatePicker.js'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import type { Allergy } from '../../../lib/api.types.js'
import type { Dayjs } from 'dayjs'

interface Props { patientId: string }

const severityColors: Record<string, string> = { mild: 'green', moderate: 'orange', severe: 'red' }

export function AllergiesTab({ patientId }: Props) {
  const { t } = useTranslation()
  const { data, loading, reload } = usePatientEntity<Allergy>(api.allergies.list, patientId)
  const [open, setOpen] = useState(false)

  const columns = [
    { title: t('allergy.allergen'), dataIndex: 'allergen' },
    { title: t('allergy.reaction'), dataIndex: 'reaction', render: (v: string | null) => v ?? '-' },
    { title: t('allergy.severity'), dataIndex: 'severity', render: (v: string | null) =>
      v ? <Tag color={severityColors[v] || 'default'}>{t(`allergy.${v}`)}</Tag> : '-' },
    { title: t('allergy.diagnosedDate'), dataIndex: 'diagnosedDate', render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '-' },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('allergy.new')}</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} size="small" />
      <EntityFormModal
        open={open}
        title={t('allergy.new')}
        successMsg={t('allergy.success')}
        onClose={() => setOpen(false)}
        onSubmit={(values) => api.allergies.create({
          patientId,
          ...values,
          diagnosedDate: (values.diagnosedDate as Dayjs | undefined)?.toISOString(),
        }).then(reload)}
      >
        <Form.Item name="allergen" label={t('allergy.allergen')} rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="reaction" label={t('allergy.reaction')}><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="severity" label={t('allergy.severity')}>
          <Select options={[
            { value: 'mild', label: t('allergy.mild') },
            { value: 'moderate', label: t('allergy.moderate') },
            { value: 'severe', label: t('allergy.severe') },
          ]} />
        </Form.Item>
        <Form.Item name="diagnosedDate" label={t('allergy.diagnosedDate')}>
          <MaskedDatePicker style={{ width: '100%' }} />
        </Form.Item>
      </EntityFormModal>
    </>
  )
}
