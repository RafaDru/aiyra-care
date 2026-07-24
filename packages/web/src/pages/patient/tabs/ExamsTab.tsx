import { useState } from 'react'
import { Table, Button, Form, DatePicker, Input } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import type { Exam } from '../../../lib/api.types.js'

interface Props { patientId: string }

export function ExamsTab({ patientId }: Props) {
  const { t } = useTranslation()
  const { data, loading, reload } = usePatientEntity<Exam>(api.exams.list, patientId)
  const [open, setOpen] = useState(false)

  const columns = [
    { title: t('exam.type'), dataIndex: 'examType' },
    { title: t('exam.date'), dataIndex: 'examDate', render: (v: string) => new Date(v).toLocaleDateString() },
    { title: t('exam.laboratory'), dataIndex: 'laboratory', render: (v: string | null) => v ?? '-' },
    { title: t('exam.result'), dataIndex: 'resultSummary', render: (v: string | null) => v ? `${v.substring(0, 50)}...` : '-' },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('exam.new')}</Button>
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
          examDate: (values.examDate as Date).toISOString(),
        }).then(reload)}
      >
        <Form.Item name="examType" label={t('exam.type')} rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="examDate" label={t('exam.date')} rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="laboratory" label={t('exam.laboratory')}><Input /></Form.Item>
        <Form.Item name="resultSummary" label={t('exam.result')}><Input.TextArea rows={3} /></Form.Item>
      </EntityFormModal>
    </>
  )
}
