import { useState } from 'react'
import { Table, Button, Form, Input, Tag, Space } from 'antd'
import { QuickClinicalUploadButton } from '../../../components/document/QuickClinicalUploadButton.js'
import { MaskedDatePicker } from '../../../components/ui/MaskedDatePicker.js'
import { CarePlaceAutocomplete } from '../../../components/ui/CarePlaceAutocomplete.js'
import { PlusOutlined, FilePdfOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api, documentDownloadUrl } from '../../../lib/api.js'
import {
  examDocumentIdFromNotes,
  examImageDocumentIdsFromNotes,
  examImageSeriesCountFromNotes,
} from '../../../lib/exam-notes.js'
import { ExamSliceViewer } from '../../../components/exam/ExamSliceViewer.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import { SourceTag } from '../../../components/ui/SourceTag.js'
import type { Exam } from '../../../lib/api.types.js'
import type { Dayjs } from 'dayjs'

interface Props { patientId: string }

export function ExamsTab({ patientId }: Props) {
  const { t } = useTranslation()
  const { data, loading, reload } = usePatientEntity<Exam>(api.exams.list, patientId)
  const [open, setOpen] = useState(false)
  const [sliceViewer, setSliceViewer] = useState<{ title: string; documentIds: string[] } | null>(null)

  const openSliceViewer = (row: Exam) => {
    const ids = examImageDocumentIdsFromNotes(row.notes)
    if (ids.length === 0) return
    setSliceViewer({ title: row.examType, documentIds: ids })
  }

  const columns = [
    { title: t('exam.type'), dataIndex: 'examType' },
    { title: t('exam.date'), dataIndex: 'examDate', render: (v: string) => new Date(v).toLocaleDateString() },
    { title: t('exam.laboratory'), dataIndex: 'laboratory', render: (v: string | null) => v ?? '-' },
    { title: t('exam.result'), dataIndex: 'resultSummary', render: (v: string | null) => v ? `${v.substring(0, 50)}...` : '-' },
    {
      title: t('exam.file'),
      key: 'file',
      render: (_: unknown, row: Exam) => {
        const docId = examDocumentIdFromNotes(row.notes)
        const seriesCount = examImageSeriesCountFromNotes(row.notes)
        if (!docId && !row.resultFileUrl && seriesCount === 0) return '-'
        return (
          <span>
            {docId && (
              <a href={documentDownloadUrl(docId)} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>
                <FilePdfOutlined /> {t('exam.viewFile')}
              </a>
            )}
            {seriesCount > 0 && (
              <Button
                type="link"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => openSliceViewer(row)}
                style={{ padding: 0, height: 'auto' }}
              >
                <Tag color="blue" style={{ marginRight: 0 }}>
                  {seriesCount} {t('exam.slices')}
                </Tag>
              </Button>
            )}
          </span>
        )
      },
    },
    { title: 'Origem', dataIndex: 'source', render: (v: string) => <SourceTag source={v} /> },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('exam.new')}</Button>
          <QuickClinicalUploadButton patientId={patientId} documentType="exam" onRecordsUpdated={reload} />
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} size="small" />
      <EntityFormModal
        open={open}
        title={t('exam.new')}
        successMsg={t('exam.success')}
        onClose={() => setOpen(false)}
        onSubmit={(values) => api.exams.create({
          patientId,
          ...values,
          examDate: (values.examDate as Dayjs).toISOString(),
        }).then(reload)}
      >
        <Form.Item name="examType" label={t('exam.type')} rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="examDate" label={t('exam.date')} rules={[{ required: true }]}>
          <MaskedDatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="laboratory" label={t('exam.laboratory')}>
          <CarePlaceAutocomplete />
        </Form.Item>
        <Form.Item name="resultSummary" label={t('exam.result')}><Input.TextArea rows={3} /></Form.Item>
      </EntityFormModal>
      <ExamSliceViewer
        open={sliceViewer != null}
        examTitle={sliceViewer?.title ?? ''}
        documentIds={sliceViewer?.documentIds ?? []}
        onClose={() => setSliceViewer(null)}
      />
    </>
  )
}
