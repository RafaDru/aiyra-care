import { useMemo, useState } from 'react'
import { Table, Button, Form, Input, Switch, Tag, Space, Modal, Typography, Tooltip, DatePicker } from 'antd'
import { MaskedDatePicker } from '../../../components/ui/MaskedDatePicker.js'
import { QuickClinicalUploadButton } from '../../../components/document/QuickClinicalUploadButton.js'
import { EditOutlined, PlayCircleOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import type { Medication } from '../../../lib/api.types.js'
import {
  effectiveDuration,
  formatMedicationDate,
  parseDurationDays,
  projectEndDate,
  resolveProjectedEndDate,
} from '../../../lib/medication-duration.js'

interface Props { patientId: string }

const { Text } = Typography

function medicationFormValues(med: Medication) {
  return {
    genericName: med.genericName,
    brandName: med.brandName ?? undefined,
    dosage: med.dosage ?? undefined,
    frequency: med.frequency ?? undefined,
    route: med.route ?? undefined,
    duration: effectiveDuration(med) ?? undefined,
    startDate: med.startDate ? dayjs(med.startDate) : undefined,
    endDate: med.endDate ? dayjs(med.endDate) : undefined,
    prescribingDoctor: med.prescribingDoctor ?? undefined,
    notes: med.notes ?? undefined,
    isActive: med.isActive,
  }
}

function buildPayload(values: Record<string, unknown>, opts?: { startedAt?: string; endDateIsProjected?: boolean }) {
  const duration = (values.duration as string | undefined)?.trim() || undefined
  const startDate = values.startDate as dayjs.Dayjs | undefined
  const endDateInput = values.endDate as dayjs.Dayjs | undefined
  const startedAt = opts?.startedAt

  let endDate = endDateInput?.toISOString()
  let endDateIsProjected = opts?.endDateIsProjected ?? false

  const anchor = startedAt ?? startDate?.toISOString()
  const days = parseDurationDays(duration)
  if (days && anchor) {
    const projected = projectEndDate(new Date(anchor), days)
    if (!endDateInput || opts?.endDateIsProjected) {
      endDate = projected.toISOString()
      endDateIsProjected = true
    }
  }

  return {
    genericName: values.genericName as string,
    brandName: (values.brandName as string | undefined) || undefined,
    dosage: (values.dosage as string | undefined) || undefined,
    frequency: (values.frequency as string | undefined) || undefined,
    route: (values.route as string | undefined) || undefined,
    duration,
    startDate: startDate?.toISOString(),
    startedAt,
    endDate,
    endDateIsProjected,
    prescribingDoctor: (values.prescribingDoctor as string | undefined) || undefined,
    notes: (values.notes as string | undefined) || undefined,
    isActive: values.isActive as boolean | undefined,
  }
}

function MedicationFormFields() {
  const { t } = useTranslation()
  return (
    <>
      <Form.Item name="genericName" label={t('medication.genericName')} rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="brandName" label={t('medication.brandName')}><Input /></Form.Item>
      <Form.Item name="dosage" label={t('medication.dosage')}><Input placeholder="250mg / 1 ampola" /></Form.Item>
      <Form.Item name="frequency" label={t('medication.frequency')}><Input placeholder="8/8h / 12/12h" /></Form.Item>
      <Form.Item name="route" label={t('medication.route')}><Input placeholder="oral, nebulização, IV…" /></Form.Item>
      <Form.Item name="duration" label={t('medication.duration')}><Input placeholder="5 dias, 2 semanas…" /></Form.Item>
      <Form.Item name="startDate" label={t('medication.prescribedDate')}>
        <MaskedDatePicker style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="endDate" label={t('medication.endDate')}>
        <MaskedDatePicker style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.duration !== cur.duration || prev.startDate !== cur.startDate}>
        {({ getFieldValue }) => {
          const duration = getFieldValue('duration') as string | undefined
          const startDate = getFieldValue('startDate') as dayjs.Dayjs | undefined
          const days = parseDurationDays(duration)
          if (!days || !startDate) return null
          const projected = projectEndDate(startDate.toDate(), days)
          return (
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              {t('medication.projectedEndHint', { date: formatMedicationDate(projected) })}
            </Text>
          )
        }}
      </Form.Item>
      <Form.Item name="prescribingDoctor" label={t('medication.doctor')}><Input /></Form.Item>
      <Form.Item name="notes" label={t('medication.notes')}><Input.TextArea rows={2} /></Form.Item>
      <Form.Item name="isActive" label={t('medication.active')} valuePropName="checked"><Switch defaultChecked /></Form.Item>
    </>
  )
}

export function MedicationsTab({ patientId }: Props) {
  const { t } = useTranslation()
  const { data, loading, reload } = usePatientEntity<Medication>(api.medications.list, patientId)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Medication | null>(null)
  const [starting, setStarting] = useState<Medication | null>(null)
  const [startAt, setStartAt] = useState(dayjs())
  const [startingSubmit, setStartingSubmit] = useState(false)

  const editInitial = useMemo(
    () => (editing ? medicationFormValues(editing) : undefined),
    [editing],
  )

  const renderEndDate = (med: Medication) => {
    const stored = med.endDate ? formatMedicationDate(med.endDate) : null
    const projected = resolveProjectedEndDate(med)
    if (stored) {
      return med.endDateIsProjected ? `${stored} *` : stored
    }
    if (projected) {
      return `${formatMedicationDate(projected)} *`
    }
    return '-'
  }

  const renderStart = (med: Medication) => {
    if (med.startedAt) {
      return (
        <Space direction="vertical" size={0}>
          <Text>{formatMedicationDate(med.startedAt)}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {new Date(med.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {' · '}{t('medication.started')}
          </Text>
        </Space>
      )
    }
    if (med.startDate) {
      return (
        <Space direction="vertical" size={0}>
          <Text>{formatMedicationDate(med.startDate)}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{t('medication.prescribedOnly')}</Text>
        </Space>
      )
    }
    return '-'
  }

  const handleStart = async () => {
    if (!starting) return
    setStartingSubmit(true)
    try {
      const startedAt = startAt.toISOString()
      const duration = effectiveDuration(starting)
      const days = parseDurationDays(duration)
      const payload: Record<string, unknown> = { startedAt, isActive: true }
      if (days) {
        payload.endDate = projectEndDate(startAt.toDate(), days).toISOString()
        payload.endDateIsProjected = true
      }
      await api.medications.update(starting.id, payload)
      setStarting(null)
      await reload()
    } finally {
      setStartingSubmit(false)
    }
  }

  const columns = [
    {
      title: t('medication.genericName'),
      dataIndex: 'genericName',
      render: (name: string, r: Medication) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          {r.brandName && <Text type="secondary" style={{ fontSize: 12 }}>{r.brandName}</Text>}
        </Space>
      ),
    },
    { title: t('medication.dosage'), dataIndex: 'dosage', render: (v: string | null) => v ?? '-' },
    { title: t('medication.frequency'), dataIndex: 'frequency', render: (v: string | null) => v ?? '-' },
    { title: t('medication.route'), dataIndex: 'route', render: (v: string | null) => v ?? '-' },
    {
      title: t('medication.duration'),
      key: 'duration',
      render: (_: unknown, r: Medication) => effectiveDuration(r) ?? '-',
    },
    { title: t('medication.startDate'), key: 'start', render: (_: unknown, r: Medication) => renderStart(r) },
    {
      title: t('medication.endDate'),
      key: 'endDate',
      render: (_: unknown, r: Medication) => (
        <Tooltip title={r.endDateIsProjected || resolveProjectedEndDate(r) ? t('medication.projectedDate') : undefined}>
          <span>{renderEndDate(r)}</span>
        </Tooltip>
      ),
    },
    { title: t('medication.doctor'), dataIndex: 'prescribingDoctor', render: (v: string | null) => v ?? '-' },
    { title: t('medication.active'), dataIndex: 'isActive', render: (v: boolean) => v ? <Tag color="green">{t('medication.yes')}</Tag> : <Tag color="red">{t('medication.no')}</Tag> },
    {
      title: '',
      key: 'actions',
      width: 96,
      render: (_: unknown, r: Medication) => (
        <Space size={4}>
          <Tooltip title={t('medication.edit')}>
            <Button type="text" icon={<EditOutlined />} aria-label={t('medication.edit')} onClick={() => setEditing(r)} />
          </Tooltip>
          {r.isActive && !r.startedAt && (
            <Tooltip title={t('medication.startTreatment')}>
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                aria-label={t('medication.startTreatment')}
                onClick={() => { setStarting(r); setStartAt(dayjs()) }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>{t('medication.new')}</Button>
          <QuickClinicalUploadButton patientId={patientId} documentType="prescription" onRecordsUpdated={reload} />
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} size="small" scroll={{ x: 960 }} />

      <EntityFormModal
        open={createOpen}
        title={t('medication.new')}
        successMsg={t('medication.success')}
        onClose={() => setCreateOpen(false)}
        onSubmit={(values) => api.medications.create({ patientId, ...buildPayload(values) }).then(reload)}
      >
        <MedicationFormFields />
      </EntityFormModal>

      <EntityFormModal
        key={editing?.id ?? 'edit'}
        open={!!editing}
        title={t('medication.edit')}
        successMsg={t('medication.updated')}
        initialValues={editInitial}
        onClose={() => setEditing(null)}
        onSubmit={(values) => {
          if (!editing) return Promise.resolve()
          return api.medications.update(editing.id, buildPayload(values, {
            startedAt: editing.startedAt ?? undefined,
            endDateIsProjected: editing.endDateIsProjected,
          })).then(reload)
        }}
      >
        <MedicationFormFields />
      </EntityFormModal>

      <Modal
        open={!!starting}
        title={t('medication.startTreatment')}
        okText={t('medication.confirmStart')}
        cancelText={t('common.cancel')}
        confirmLoading={startingSubmit}
        onCancel={() => setStarting(null)}
        onOk={() => void handleStart()}
      >
        {starting && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Text>
              <strong>{starting.genericName}</strong>
              {starting.dosage ? ` · ${starting.dosage}` : ''}
              {starting.route ? ` · ${starting.route}` : ''}
            </Text>
            <div>
              <Text type="secondary">{t('medication.startAt')}</Text>
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                value={startAt}
                onChange={(v) => v && setStartAt(v)}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>
            {parseDurationDays(effectiveDuration(starting)) && (
              <Text type="secondary">
                {t('medication.projectedEndHint', {
                  date: formatMedicationDate(projectEndDate(startAt.toDate(), parseDurationDays(effectiveDuration(starting))!)),
                })}
              </Text>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>{t('medication.startReminderHint')}</Text>
          </Space>
        )}
      </Modal>
    </>
  )
}
