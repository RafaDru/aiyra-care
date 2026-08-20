import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button, Form, Input, Tag, Space, message, Table, Typography, Segmented } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { QuickClinicalUploadButton } from '../../../components/document/QuickClinicalUploadButton.js'
import { ExamMarkersDashboard } from '../../../components/patient/ExamMarkersDashboard.js'
import { InlineExamMarkersList } from '../../../components/patient/InlineExamMarkersList.js'
import { MaskedDatePicker } from '../../../components/ui/MaskedDatePicker.js'
import { CarePlaceAutocomplete } from '../../../components/ui/CarePlaceAutocomplete.js'
import { PlusOutlined, FilePdfOutlined, PlayCircleOutlined, LinkOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api, openAuthenticatedDownload } from '../../../lib/api.js'
import {
  examDocumentIdFromNotes,
  examImageDocumentIdsFromNotes,
  examImageSeriesCountFromNotes,
} from '../../../lib/exam-notes.js'
import { examOrderDisplayLabel } from '../../../lib/exam-order-label.js'
import { ExamSliceViewer } from '../../../components/exam/ExamSliceViewer.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { useClinicalLinkCounts } from '../../../hooks/useClinicalLinkCounts.js'
import { clinicalEntityRowProps, useClinicalEntityHighlight } from '../../../hooks/useClinicalEntityHighlight.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import { SourceTag } from '../../../components/ui/SourceTag.js'
import { EntityClinicalLinksCell } from '../../../components/patient/EntityClinicalLinksCell.js'
import { EntityClinicalLinksExpandedPanel } from '../../../components/patient/EntityClinicalLinksExpandedPanel.js'
import { ClinicalIndentPanel } from '../../../components/patient/ClinicalIndentPanel.js'
import { CLINICAL_SEQUENCE_COPY } from '../../../components/patient/clinical-sequence-copy.js'
import { ALIGNED_TABLE_FRAME_STYLE } from '../../../components/layout/aligned-table-columns.js'
import '../../../components/patient/clinical-entity-highlight.css'
import type { Exam, ExamOrder } from '../../../lib/api.types.js'
import type { Dayjs } from 'dayjs'

const { Text } = Typography

interface Props {
  patientId: string
  highlightEntityId?: string | null
}

type ExamListRow =
  | { type: 'order'; key: string; order: ExamOrder; exams: Exam[] }
  | { type: 'exam'; key: string; exam: Exam }

const ORDER_ACCENT = '#2563EB'

function syntheticOrder(orderId: string, exams: Exam[]): ExamOrder {
  const first = exams[0]
  return {
    id: orderId,
    patientId: first.patientId,
    externalKey: orderId,
    source: first.source,
    portalOrderId: null,
    orderDate: first.examDate,
    laboratory: first.laboratory,
    resultFileUrl: null,
    documentId: null,
    notes: null,
    createdAt: first.examDate,
  }
}

function rowSortDate(row: ExamListRow): number {
  if (row.type === 'order') {
    if (row.order.orderDate) return new Date(row.order.orderDate).getTime()
    return Math.max(...row.exams.map((e) => new Date(e.examDate).getTime()))
  }
  return new Date(row.exam.examDate).getTime()
}

export function ExamsTab({ patientId, highlightEntityId }: Props) {
  const { t } = useTranslation()
  const { data, loading, reload } = usePatientEntity<Exam>(api.exams.list, patientId)
  const [orders, setOrders] = useState<ExamOrder[]>([])
  const { getCount, reload: reloadLinkCounts } = useClinicalLinkCounts(patientId)
  const [open, setOpen] = useState(false)
  const [sliceViewer, setSliceViewer] = useState<{ title: string; documentIds: string[] } | null>(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])

  const loadOrders = () =>
    api.examOrders.list(patientId).then(setOrders).catch(() => setOrders([]))

  useEffect(() => {
    loadOrders()
  }, [patientId])

  const reloadAll = () => {
    reload()
    loadOrders()
    reloadLinkCounts()
  }

  const rowIds = data.map((r) => r.id)
  useClinicalEntityHighlight(highlightEntityId, rowIds)

  const toggleExpand = (rowKey: string) => {
    setExpandedRowKeys((prev) =>
      prev.includes(rowKey) ? prev.filter((k) => k !== rowKey) : [...prev, rowKey],
    )
  }

  const openSliceViewer = (row: Exam) => {
    const ids = examImageDocumentIdsFromNotes(row.notes)
    if (ids.length === 0) return
    setSliceViewer({ title: row.examType, documentIds: ids })
  }

  const openExamDownload = async (path: string) => {
    try {
      await openAuthenticatedDownload(path)
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Erro ao abrir arquivo')
    }
  }

  const orderPdfButton = (order: ExamOrder) => {
    if (order.documentId) {
      return (
        <Button
          type="link"
          size="small"
          icon={<FilePdfOutlined />}
          onClick={() => openExamDownload(`/documents/${order.documentId}/download`)}
        >
          {t('exam.orderPdf')}
        </Button>
      )
    }
    if (order.resultFileUrl) {
      return (
        <Button
          type="link"
          size="small"
          icon={<FilePdfOutlined />}
          onClick={() => openExamDownload(`/exam-orders/${order.id}/result-file`)}
        >
          {t('exam.orderPdf')}
        </Button>
      )
    }
    return null
  }

  const renderExamFileCell = (row: Exam) => {
    const docId = examDocumentIdFromNotes(row.notes)
    const seriesCount = examImageSeriesCountFromNotes(row.notes)
    if (!docId && !row.resultFileUrl && seriesCount === 0) return '-'
    return (
      <span>
        {docId && (
          <Button
            type="link"
            size="small"
            icon={<FilePdfOutlined />}
            onClick={() => openExamDownload(`/documents/${docId}/download`)}
            style={{ padding: 0, height: 'auto', marginRight: 8 }}
          >
            {t('exam.viewFile')}
          </Button>
        )}
        {row.resultFileUrl && (
          <Button
            type="link"
            size="small"
            icon={<FilePdfOutlined />}
            onClick={() => openExamDownload(`/exams/${row.id}/result-file`)}
            style={{ padding: 0, height: 'auto', marginRight: 8 }}
          >
            {t('exam.viewLaudo')}
          </Button>
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
  }

  const renderClinicalLinksCell = (exam: Exam) => {
    const count = getCount('exam', exam.id)
    const expanded = expandedRowKeys.includes(exam.id)
    if (count === 0) {
      return (
        <EntityClinicalLinksCell
          patientId={patientId}
          entityType="exam"
          entityId={exam.id}
          entityTitle={exam.examType}
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
        onClick={() => toggleExpand(exam.id)}
        style={{ padding: 0, fontWeight: 500 }}
      >
        {count} na sequência {expanded ? <UpOutlined /> : <DownOutlined />}
      </Button>
    )
  }

  const examColumns: ColumnsType<Exam> = [
    { title: t('exam.column'), dataIndex: 'examType' },
    {
      title: t('exam.date'),
      dataIndex: 'examDate',
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    {
      title: t('exam.laboratory'),
      dataIndex: 'laboratory',
      render: (v: string | null) => v ?? '-',
    },
    {
      title: t('exam.result'),
      dataIndex: 'resultSummary',
      render: (v: string | null) => (v ? `${v.substring(0, 50)}...` : '-'),
    },
    {
      title: t('exam.file'),
      key: 'file',
      render: (_: unknown, row: Exam) => renderExamFileCell(row),
    },
    {
      title: 'Origem',
      dataIndex: 'source',
      render: (v: string) => <SourceTag source={v} />,
    },
    {
      title: CLINICAL_SEQUENCE_COPY.columnTitle,
      key: 'clinicalLinks',
      width: 160,
      render: (_: unknown, row: Exam) => renderClinicalLinksCell(row),
    },
  ]

  const listRows = useMemo((): ExamListRow[] => {
    const byOrder = new Map<string, Exam[]>()
    const standalone: Exam[] = []

    for (const exam of data) {
      if (exam.examOrderId) {
        const list = byOrder.get(exam.examOrderId) ?? []
        list.push(exam)
        byOrder.set(exam.examOrderId, list)
      } else {
        standalone.push(exam)
      }
    }

    const rows: ExamListRow[] = []

    const sortedOrders = [...orders].sort((a, b) => {
      const da = a.orderDate ? new Date(a.orderDate).getTime() : 0
      const db = b.orderDate ? new Date(b.orderDate).getTime() : 0
      return db - da
    })

    for (const order of sortedOrders) {
      const exams = byOrder.get(order.id)
      if (!exams?.length) continue
      exams.sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime())
      rows.push({ type: 'order', key: `order:${order.id}`, order, exams })
      byOrder.delete(order.id)
    }

    for (const [orderId, exams] of byOrder) {
      exams.sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime())
      rows.push({
        type: 'order',
        key: `order:${orderId}`,
        order: syntheticOrder(orderId, exams),
        exams,
      })
    }

    for (const exam of standalone) {
      rows.push({ type: 'exam', key: exam.id, exam })
    }

    return rows.sort((a, b) => rowSortDate(b) - rowSortDate(a))
  }, [data, orders])

  const topLevelColumns: ColumnsType<ExamListRow> = [
    {
      title: t('exam.column'),
      key: 'exam',
      render: (_: unknown, row: ExamListRow) => {
        if (row.type === 'order') {
          return (
            <div>
              <Text>{examOrderDisplayLabel(row.order)}</Text>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                {t('exam.orderCount', { count: row.exams.length })}
              </Text>
            </div>
          )
        }
        return row.exam.examType
      },
    },
    {
      title: t('exam.date'),
      key: 'date',
      render: (_: unknown, row: ExamListRow) => {
        if (row.type === 'order') {
          return row.order.orderDate
            ? new Date(row.order.orderDate).toLocaleDateString()
            : new Date(row.exams[0].examDate).toLocaleDateString()
        }
        return new Date(row.exam.examDate).toLocaleDateString()
      },
    },
    {
      title: t('exam.laboratory'),
      key: 'laboratory',
      render: (_: unknown, row: ExamListRow) => {
        if (row.type === 'order') {
          return row.order.laboratory ?? row.exams[0].laboratory ?? '-'
        }
        return row.exam.laboratory ?? '-'
      },
    },
    {
      title: t('exam.result'),
      key: 'result',
      render: (_: unknown, row: ExamListRow) => {
        if (row.type === 'order') return '-'
        const v = row.exam.resultSummary
        return v ? `${v.substring(0, 50)}...` : '-'
      },
    },
    {
      title: t('exam.file'),
      key: 'file',
      render: (_: unknown, row: ExamListRow) => {
        if (row.type === 'order') return orderPdfButton(row.order) ?? '-'
        return renderExamFileCell(row.exam)
      },
    },
    {
      title: 'Origem',
      key: 'source',
      render: (_: unknown, row: ExamListRow) => {
        const source = row.type === 'order' ? row.order.source : row.exam.source
        return <SourceTag source={source} />
      },
    },
    {
      title: CLINICAL_SEQUENCE_COPY.columnTitle,
      key: 'clinicalLinks',
      width: 160,
      render: (_: unknown, row: ExamListRow) => {
        if (row.type === 'order') return '-'
        return renderClinicalLinksCell(row.exam)
      },
    },
  ]

  const expandedRowRender = (row: ExamListRow): ReactNode => {
    if (row.type === 'order') {
      return (
        <ClinicalIndentPanel accentColor={ORDER_ACCENT}>
          <Table<Exam>
            size="small"
            pagination={false}
            showHeader
            tableLayout="fixed"
            dataSource={row.exams}
            rowKey="id"
            columns={examColumns}
            onRow={(exam) => clinicalEntityRowProps(exam.id, highlightEntityId)}
            expandable={{
              showExpandColumn: false,
              expandedRowKeys,
              onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
              rowExpandable: () => true,
              expandedRowRender: (exam) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <InlineExamMarkersList examId={exam.id} />
                  {getCount('exam', exam.id) > 0 && (
                    <EntityClinicalLinksExpandedPanel
                      patientId={patientId}
                      entityType="exam"
                      entityId={exam.id}
                      entityTitle={exam.examType}
                      onUpdated={() => {
                        reloadLinkCounts()
                        if (getCount('exam', exam.id) === 0) {
                          setExpandedRowKeys((prev) => prev.filter((k) => k !== exam.id))
                        }
                      }}
                    />
                  )}
                </div>
              ),
            }}
          />
        </ClinicalIndentPanel>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <InlineExamMarkersList examId={row.exam.id} />
        {getCount('exam', row.exam.id) > 0 && (
          <EntityClinicalLinksExpandedPanel
            patientId={patientId}
            entityType="exam"
            entityId={row.exam.id}
            entityTitle={row.exam.examType}
            onUpdated={() => {
              reloadLinkCounts()
              if (getCount('exam', row.exam.id) === 0) {
                setExpandedRowKeys((prev) => prev.filter((k) => k !== row.exam.id))
              }
            }}
          />
        )}
      </div>
    )
  }

  const rowExpandable = (row: ExamListRow) =>
    row.type === 'order' || true

  const [activeSubTab, setActiveSubTab] = useState<'list' | 'markers'>('list')

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('exam.new')}</Button>
          <QuickClinicalUploadButton patientId={patientId} documentType="exam" onRecordsUpdated={reloadAll} />
        </Space>
        <Segmented
          value={activeSubTab}
          onChange={(val) => setActiveSubTab(val as 'list' | 'markers')}
          options={[
            { value: 'list', label: 'Laudos & Pedidos' },
            { value: 'markers', label: 'Marcadores do Exame' },
          ]}
        />
      </div>

      {activeSubTab === 'markers' ? (
        <ExamMarkersDashboard patientId={patientId} />
      ) : (
        <Table<ExamListRow>
          dataSource={listRows}
          columns={topLevelColumns}
          rowKey="key"
          loading={loading}
          pagination={false}
          size="small"
          tableLayout="fixed"
          style={ALIGNED_TABLE_FRAME_STYLE}
          onRow={(row) =>
            row.type === 'exam' ? clinicalEntityRowProps(row.exam.id, highlightEntityId) : {}
          }
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
            rowExpandable,
            expandedRowRender,
          }}
        />
      )}
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
          reloadAll()
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
