import { useState } from 'react'
import { Table, Button, Form, Input, Select } from 'antd'
import { MaskedDatePicker } from '../../../components/ui/MaskedDatePicker.js'
import { CarePlaceAutocomplete } from '../../../components/ui/CarePlaceAutocomplete.js'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import { SourceTag } from '../../../components/ui/SourceTag.js'
import type { MedicalRecord } from '../../../lib/api.types.js'
import type { Dayjs } from 'dayjs'

interface Props { patientId: string }

export function MedicalRecordsTab({ patientId }: Props) {
  const { t } = useTranslation()
  const { data, loading, reload } = usePatientEntity<MedicalRecord>(api.medicalRecords.list, patientId)
  const [open, setOpen] = useState(false)

  const columns = [
    { title: t('medicalRecord.date'), dataIndex: 'recordDate', render: (v: string) => new Date(v).toLocaleDateString() },
    { title: t('medicalRecord.type'), dataIndex: 'recordType' },
    { title: t('medicalRecord.doctor'), dataIndex: 'doctorName', render: (v: string | null) => v ?? '-' },
    { title: t('medicalRecord.specialty'), dataIndex: 'specialty', render: (v: string | null) => v ?? '-' },
    { title: t('medicalRecord.clinic'), dataIndex: 'clinicName', render: (v: string | null) => v ?? '-' },
    { title: 'Valor', dataIndex: 'chargedAmount', render: (v: number | null) => v != null ? `R$ ${Number(v).toFixed(2)}` : '-' },
    { title: 'Nota', dataIndex: 'invoiceNumber', render: (v: string | null) => v ?? '-' },
    { title: t('medicalRecord.description'), dataIndex: 'description', render: (v: string | null) => v ? `${v.substring(0, 60)}${v.length > 60 ? '...' : ''}` : '-' },
    { title: 'Origem', dataIndex: 'source', render: (v: string) => <SourceTag source={v} /> },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('medicalRecord.new')}</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} size="small" />
      <EntityFormModal
        open={open}
        title={t('medicalRecord.new')}
        successMsg={t('medicalRecord.success')}
        onClose={() => setOpen(false)}
        onSubmit={(values) => api.medicalRecords.create({
          patientId,
          ...values,
          recordDate: (values.recordDate as Dayjs).toISOString(),
        }).then(reload)}
      >
        <Form.Item name="recordDate" label={t('medicalRecord.date')} rules={[{ required: true }]}>
          <MaskedDatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="recordType" label={t('medicalRecord.type')} rules={[{ required: true }]}>
          <Select options={[
            { value: 'consulta', label: 'Consulta' },
            { value: 'retorno', label: 'Retorno' },
            { value: 'pronto-socorro', label: 'Pronto Socorro' },
            { value: 'teleconsulta', label: 'Teleconsulta' },
            { value: 'outro', label: 'Outro' },
          ]} />
        </Form.Item>
        <Form.Item name="description" label={t('medicalRecord.description')}><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="doctorName" label={t('medicalRecord.doctor')}><Input /></Form.Item>
        <Form.Item name="specialty" label={t('medicalRecord.specialty')}><Input /></Form.Item>
        <Form.Item name="clinicName" label={t('medicalRecord.clinic')}>
          <CarePlaceAutocomplete />
        </Form.Item>
      </EntityFormModal>
    </>
  )
}
