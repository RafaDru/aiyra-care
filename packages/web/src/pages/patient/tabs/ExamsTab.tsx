import { useState } from 'react'
import { Table, Button, Form, Input, Tag, Space } from 'antd'
import { QuickClinicalUploadButton } from '../../../components/document/QuickClinicalUploadButton.js'
import { MaskedDatePicker } from '../../../components/ui/MaskedDatePicker.js'
import { CarePlaceAutocomplete } from '../../../components/ui/CarePlaceAutocomplete.js'
import { PlusOutlined, FilePdfOutlined, PlayCircleOutlined, LinkOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api, documentDownloadUrl } from '../../../lib/api.js'
import {
  examDocumentIdFromNotes,
  examImageDocumentIdsFromNotes,
  examImageSeriesCountFromNotes,
} from '../../../lib/exam-notes.js'
import { ExamSliceViewer } from '../../../components/exam/ExamSliceViewer.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { useClinicalLinkCounts } from '../../../hooks/useClinicalLinkCounts.js'
import { clinicalEntityRowProps, useClinicalEntityHighlight } from '../../../hooks/useClinicalEntityHighlight.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import { SourceTag } from '../../../components/ui/SourceTag.js'
import { EntityClinicalLinksCell } from '../../../components/patient/EntityClinicalLinksCell.js'
import { EntityClinicalLinksExpandedPanel } from '../../../components/patient/EntityClinicalLinksExpandedPanel.js'
import { CLINICAL_SEQUENCE_COPY } from '../../../components/patient/clinical-sequence-copy.js'
import '../../../components/patient/clinical-entity-highlight.css'
import type { Exam } from '../../../lib/api.types.js'
import type { Dayjs } from 'dayjs'

interface Props {
  patientId: string
  highlightEntityId?: string | null
}

export function ExamsTab({ patientId, highlightEntityId }: Props) {
  const { t } = useTranslation()
  const { data, loading, reload } = usePatientEntity<Exam>(api.exams.list, patientId)
  const { getCount, reload: reloadLinkCounts } = useClinicalLinkCounts(patientId)
  const [open, setOpen] = useState(false)
  const [sliceViewer, setSliceViewer] = useState<{ title: string; documentIds: string[] } | null>(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])

  const rowIds = data.map((r) => r.id)
  useClinicalEntityHighlight(highlightEntityId, rowIds)

  const toggleExpand = (rowId: string) => {
    setExpandedRowKeys((prev) =>
      prev.includes(rowId) ? prev.filter((k) => k !== rowId) : [...prev, rowId],
    )
  }

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
    {
      title: CLINICAL_SEQUENCE_COPY.columnTitle,
      key: 'clinicalLinks',
      width: 160,
      render: (_: unknown, row: Exam) => {
        const count = getCount('exam', row.id)
        const expanded = expandedRowKeys.includes(row.id)
        if (count === 0) {
          return (
            <EntityClinicalLinksCell
              patientId={patientId}
              entityType="exam"
              entityId={row.id}
              entityTitle={row.examType}
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
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('exam.new')}</Button>
          <QuickClinicalUploadButton patientId={patientId} documentType="exam" onRecordsUpdated={reload} />
        </Space>
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
          rowExpandable: (row) => getCount('exam', row.id) > 0,
          expandedRowRender: (row) => (
            <EntityClinicalLinksExpandedPanel
              patientId={patientId}
              entityType="exam"
              entityId={row.id}
              entityTitle={row.examType}
              onUpdated={() => {
                reloadLinkCounts()
                if (getCount('exam', row.id) === 0) {
                  setExpandedRowKeys((prev) => prev.filter((k) => k !== row.id))
                }
              }}
            />
          ),
        }}
      />
      <EntityFormModal
        open={open}
        title={t('exam.new')}
        successMsg={t('exam.success')}
        onClose={() => setOpen(false)}
        onSubmit={(values) => api.exams.create({
          patientId,
          ...values,
          examDate: (values.examDate as Dayjs).toISOString(),
        }).then(() => {
          reload()
          reloadLinkCounts()
        })}
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
