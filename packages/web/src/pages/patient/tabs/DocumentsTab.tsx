import { useState } from 'react'
import { Table, Button, Form, Input, Select, InputNumber, Tag } from 'antd'
import { PlusOutlined, FileTextOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import type { Document_ } from '../../../lib/api.types.js'

interface Props { patientId: string }

const typeColors: Record<string, string> = { prescription: 'blue', exam: 'cyan', report: 'geekblue', vaccine_card: 'green', other: 'default' }

export function DocumentsTab({ patientId }: Props) {
  const { t } = useTranslation()
  const { data, loading, reload } = usePatientEntity<Document_>(api.documents.list, patientId)
  const [open, setOpen] = useState(false)

  const columns = [
    { title: t('document.type'), dataIndex: 'documentType', render: (v: string) => <Tag color={typeColors[v]}>{v}</Tag> },
    { title: t('document.fileName'), dataIndex: 'originalFilename', render: (v: string) => <><FileTextOutlined /> {v}</> },
    { title: t('document.size'), dataIndex: 'fileSizeBytes', render: (v: number | null) => v ? `${(v / 1024).toFixed(1)} KB` : '-' },
    { title: t('document.mime'), dataIndex: 'mimeType', render: (v: string | null) => v ?? '-' },
    { title: t('document.ocr'), dataIndex: 'ocrProcessed', render: (v: boolean) =>
      v ? <Tag color="green">{t('document.processed')}</Tag> : <Tag>{t('document.pending')}</Tag> },
    { title: t('document.upload'), dataIndex: 'uploadedAt', render: (v: string) => new Date(v).toLocaleDateString() },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('document.new')}</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} size="small" />
      <EntityFormModal
        open={open}
        title={t('document.new')}
        successMsg={t('document.success')}
        onClose={() => setOpen(false)}
        onSubmit={(values) => api.documents.create({ patientId, ...values }).then(reload)}
      >
        <Form.Item name="documentType" label={t('document.type')} rules={[{ required: true }]}>
          <Select options={[
            { value: 'prescription', label: 'Prescription' },
            { value: 'exam', label: 'Exam' },
            { value: 'report', label: 'Report' },
            { value: 'vaccine_card', label: 'Vaccine Card' },
            { value: 'other', label: 'Other' },
          ]} />
        </Form.Item>
        <Form.Item name="originalFilename" label={t('document.fileName')} rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="storagePath" label={t('document.path')} rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="fileSizeBytes" label={t('document.size')}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="mimeType" label={t('document.mime')}><Input placeholder="application/pdf" /></Form.Item>
      </EntityFormModal>
    </>
  )
}
