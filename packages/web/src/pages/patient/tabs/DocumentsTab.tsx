import { useState, useRef } from 'react'
import { Table, Button, Form, Select, Tag, Modal, Upload, App } from 'antd'
import { PlusOutlined, FileTextOutlined, InboxOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import type { Document_ } from '../../../lib/api.types.js'

interface Props { patientId: string }

const { Dragger } = Upload

const typeColors: Record<string, string> = { prescription: 'blue', exam: 'cyan', report: 'geekblue', vaccine_card: 'green', other: 'default' }

export function DocumentsTab({ patientId }: Props) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { data, loading, reload } = usePatientEntity<Document_>(api.documents.list, patientId)
  const [open, setOpen] = useState(false)
  const [documentType, setDocumentType] = useState<string>('other')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      await api.documents.upload(patientId, documentType, file)
      message.success(t('document.success'))
      setOpen(false)
      setFile(null)
      reload()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erro no upload')
    } finally {
      setUploading(false)
    }
  }

  const columns = [
    {
      title: t('document.type'), dataIndex: 'documentType', render: (v: string) => <Tag color={typeColors[v]}>{t(`documentType.${v}`)}</Tag>,
    },
    { title: t('document.fileName'), dataIndex: 'originalFilename', render: (v: string) => <><FileTextOutlined /> {v}</> },
    { title: t('document.size'), dataIndex: 'fileSizeBytes', render: (v: number | null) => v ? `${(v / 1024).toFixed(1)} KB` : '-' },
    { title: t('document.mime'), dataIndex: 'mimeType', render: (v: string | null) => v ?? '-' },
    {
      title: t('document.ocr'), dataIndex: 'ocrProcessed', render: (v: boolean, r: Document_) =>
        v ? <Tag color="green">{t('document.processed')}</Tag> : <Tag>{t('document.pending')}</Tag>,
    },
    { title: t('document.upload'), dataIndex: 'uploadedAt', render: (v: string) => new Date(v).toLocaleDateString() },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('document.new')}</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} size="small" />
      <Modal
        title={t('document.new')}
        open={open}
        onOk={handleUpload}
        onCancel={() => { setOpen(false); setFile(null) }}
        confirmLoading={uploading}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>{t('document.type')}</div>
          <Select
            value={documentType}
            onChange={setDocumentType}
            style={{ width: '100%' }}
            options={[
              { value: 'prescription', label: t('documentType.prescription') },
              { value: 'exam', label: t('documentType.exam') },
              { value: 'report', label: t('documentType.report') },
              { value: 'vaccine_card', label: t('documentType.vaccine_card') },
              { value: 'other', label: t('documentType.other') },
            ]}
          />
        </div>
        <Dragger
          accept="image/jpeg,image/png,image/gif,image/bmp,image/webp,application/pdf"
          beforeUpload={(f) => { setFile(f); return false }}
          onRemove={() => setFile(null)}
          fileList={file ? [{ uid: '-1', name: file.name, status: 'done' }] : []}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">{t('document.dropHint')}</p>
        </Dragger>
      </Modal>
    </>
  )
}
