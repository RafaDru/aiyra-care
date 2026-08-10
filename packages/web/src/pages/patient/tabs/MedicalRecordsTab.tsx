import { useState } from 'react'
import { Table, Button, Form, Input, Select } from 'antd'
import { MaskedDatePicker } from '../../../components/ui/MaskedDatePicker.js'
import { CarePlaceAutocomplete } from '../../../components/ui/CarePlaceAutocomplete.js'
import { PlusOutlined, LinkOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { useClinicalLinkCounts } from '../../../hooks/useClinicalLinkCounts.js'
import { clinicalEntityRowProps, useClinicalEntityHighlight } from '../../../hooks/useClinicalEntityHighlight.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import { SourceTag } from '../../../components/ui/SourceTag.js'
import { EntityClinicalLinksExpandedPanel } from '../../../components/patient/EntityClinicalLinksExpandedPanel.js'
import { EntityClinicalLinksCell } from '../../../components/patient/EntityClinicalLinksCell.js'
import { CLINICAL_SEQUENCE_COPY } from '../../../components/patient/clinical-sequence-copy.js'
import '../../../components/patient/clinical-entity-highlight.css'
import type { MedicalRecord } from '../../../lib/api.types.js'
import type { Dayjs } from 'dayjs'

interface Props {
  patientId: string
  highlightEntityId?: string | null
}

export function MedicalRecordsTab({ patientId, highlightEntityId }: Props) {
  const { t } = useTranslation()
  const { data, loading, reload } = usePatientEntity<MedicalRecord>(api.medicalRecords.list, patientId)
  const { getCount, reload: reloadLinkCounts } = useClinicalLinkCounts(patientId)
  const [open, setOpen] = useState(false)
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])

  const rowIds = data.map((r) => r.id)
  useClinicalEntityHighlight(highlightEntityId, rowIds)

  const toggleExpand = (rowId: string) => {
    setExpandedRowKeys((prev) =>
      prev.includes(rowId) ? prev.filter((k) => k !== rowId) : [...prev, rowId],
    )
  }

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
    {
      title: CLINICAL_SEQUENCE_COPY.columnTitle,
      key: 'clinicalLinks',
      width: 160,
      render: (_: unknown, row: MedicalRecord) => {
        const count = getCount('medical_record', row.id)
        const expanded = expandedRowKeys.includes(row.id)
        if (count === 0) {
          return (
            <EntityClinicalLinksCell
              patientId={patientId}
              entityType="medical_record"
              entityId={row.id}
              entityTitle={row.doctorName ?? row.specialty ?? row.recordType}
              linkCount={0}
              onUpdated={reloadLinkCounts}
            />
          )
        }
        return (
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            onClick={() => toggleExpand(row.id)}
            style={{ padding: 0, fontWeight: 500 }}
          >
            {count} na sequência {expanded ? <UpOutlined /> : <DownOutlined />}
          </Button>
        )
      },
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('medicalRecord.new')}</Button>
      </div>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
        onRow={(record) => clinicalEntityRowProps(record.id, highlightEntityId)}
        expandable={{
          showExpandColumn: false,
          expandedRowKeys,
          onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
          rowExpandable: (row) => getCount('medical_record', row.id) > 0,
          expandedRowRender: (row) => (
            <EntityClinicalLinksExpandedPanel
              patientId={patientId}
              entityType="medical_record"
              entityId={row.id}
              entityTitle={row.doctorName ?? row.specialty ?? row.recordType}
              onUpdated={() => {
                reloadLinkCounts()
                if (getCount('medical_record', row.id) === 0) {
                  setExpandedRowKeys((prev) => prev.filter((k) => k !== row.id))
                }
              }}
            />
          ),
        }}
      />
      <EntityFormModal
        open={open}
        title={t('medicalRecord.new')}
        successMsg={t('medicalRecord.success')}
        onClose={() => setOpen(false)}
        onSubmit={(values) => api.medicalRecords.create({
          patientId,
          ...values,
          recordDate: (values.recordDate as Dayjs).toISOString(),
        }).then(() => {
          reload()
          reloadLinkCounts()
        })}
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
