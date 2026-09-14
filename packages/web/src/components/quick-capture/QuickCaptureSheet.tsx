import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  App,
  AutoComplete,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  Upload,
} from 'antd'
import {
  CalendarOutlined,
  EditOutlined,
  MedicineBoxOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { HealthThread, Patient } from '../../lib/api.types.js'
import { api } from '../../lib/api.js'
import { uploadDocumentWithProgress } from '../../lib/document-upload.js'
import { trackProductEvent } from '../../lib/product-events.js'
import { AvaPatientLensSelect } from '../ava/AvaPatientLensSelect.js'
import type { QuickCaptureKind } from '../../lib/quick-capture-bus.js'

const { Text } = Typography

const COMMON_MEDS = ['Dipirona', 'Paracetamol', 'Ibuprofeno', 'Nimesulida']

const KIND_OPTIONS: { kind: QuickCaptureKind; icon: ReactNode; labelKey: string }[] = [
  { kind: 'note', icon: <EditOutlined />, labelKey: 'quickCapture.kind.note' },
  { kind: 'measurement', icon: <ThunderboltOutlined />, labelKey: 'quickCapture.kind.measurement' },
  { kind: 'medication', icon: <MedicineBoxOutlined />, labelKey: 'quickCapture.kind.medication' },
  { kind: 'agenda', icon: <CalendarOutlined />, labelKey: 'quickCapture.kind.agenda' },
  { kind: 'document', icon: <UploadOutlined />, labelKey: 'quickCapture.kind.document' },
]

interface Props {
  open: boolean
  onClose: () => void
  patients: Patient[]
  patientId: string | null
  routePatientId: string | null
  onPatientChange: (id: string) => void
  initialKind?: QuickCaptureKind
}

export function QuickCaptureSheet({
  open,
  onClose,
  patients,
  patientId,
  routePatientId,
  onPatientChange,
  initialKind,
}: Props) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [kind, setKind] = useState<QuickCaptureKind>(initialKind ?? 'note')
  const [threads, setThreads] = useState<HealthThread[]>([])
  const [threadsLoading, setThreadsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()

  const activePatient = patients.find((p) => p.id === patientId) ?? null
  const threadOptions = useMemo(
    () => threads.map((th) => ({ value: th.id, label: th.title })),
    [threads],
  )

  const loadThreads = useCallback(async (pid: string) => {
    setThreadsLoading(true)
    try {
      const list = await api.healthThreads.list(pid, true)
      setThreads(list)
    } catch {
      setThreads([])
    } finally {
      setThreadsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setKind(initialKind ?? 'note')
    form.resetFields()
    form.setFieldsValue({
      observedAt: dayjs(),
      administeredAt: dayjs(),
      scheduledAt: dayjs().add(1, 'hour').minute(0),
      kind: 'reminder',
    })
    if (patientId) void loadThreads(patientId)
    trackProductEvent(
      'quick_capture_opened',
      { capture_kind: initialKind ?? 'note' },
      { patientId: patientId ?? undefined },
    )
  }, [open, initialKind, patientId, form, loadThreads])

  useEffect(() => {
    if (!open || !patientId) return
    void loadThreads(patientId)
  }, [open, patientId, loadThreads])

  const resolveThreadId = async (selectedId?: string): Promise<string> => {
    if (!patientId) throw new Error('no_patient')
    if (selectedId) return selectedId
    if (threads.length === 1) return threads[0].id
    if (threads.length === 0) {
      const thread = await api.healthThreads.create({
        patientId,
        kind: 'acompanhamento',
        title: t('quickCapture.defaultThreadTitle'),
      })
      setThreads((prev) => [...prev, thread])
      return thread.id
    }
    throw new Error('thread_required')
  }

  const handleClose = () => {
    if (saving || uploading) return
    onClose()
  }

  const afterSave = (captureKind: QuickCaptureKind) => {
    trackProductEvent('quick_capture_saved', { capture_kind: captureKind }, { patientId: patientId ?? undefined })
    message.success(t('quickCapture.saved'))
    onClose()
  }

  const saveNote = async (values: Record<string, unknown>) => {
    const body = String(values.body ?? '').trim()
    if (!body) throw new Error('empty')
    const threadId = await resolveThreadId(values.healthThreadId as string | undefined)
    await api.healthThreads.addEntry(threadId, body)
    afterSave('note')
  }

  const saveMeasurement = async (values: Record<string, unknown>) => {
    const observedAt = (values.observedAt as Dayjs).toISOString()
    const items = [
      { typeCode: 'temperature', valueNumeric: values.temperature as number | undefined },
      { typeCode: 'heart_rate', valueNumeric: values.heartRate as number | undefined },
      { typeCode: 'spo2', valueNumeric: values.spo2 as number | undefined },
    ].filter((i) => i.valueNumeric != null)
    if (!items.length) throw new Error('empty')
    await api.measurements.createBatch({
      patientId: patientId!,
      observedAt,
      healthThreadId: (values.healthThreadId as string) ?? undefined,
      items,
    })
    afterSave('measurement')
  }

  const saveMedication = async (values: Record<string, unknown>) => {
    await api.medicationAdministrations.create({
      patientId: patientId!,
      medicationName: values.medicationName as string,
      administeredAt: (values.administeredAt as Dayjs).toISOString(),
      doseGiven: values.doseGiven as string | undefined,
      healthThreadId: (values.healthThreadId as string) ?? undefined,
      notes: values.notes as string | undefined,
    })
    afterSave('medication')
  }

  const saveAgenda = async (values: Record<string, unknown>) => {
    await api.scheduledEvents.create({
      patientId: patientId!,
      title: values.title as string,
      description: (values.description as string | undefined) || undefined,
      healthThreadId: (values.healthThreadId as string | undefined) || undefined,
      scheduledAt: (values.scheduledAt as Dayjs).toISOString(),
      kind: values.kind as string,
      status: 'planned',
    })
    afterSave('agenda')
  }

  const saveDocument = async (file: File) => {
    if (!patientId) return
    setUploading(true)
    try {
      await uploadDocumentWithProgress(patientId, 'other', file, () => {})
      afterSave('document')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!patientId) {
      message.warning(t('quickCapture.pickPatient'))
      return
    }
    if (kind === 'document') return
    setSaving(true)
    try {
      const values = await form.validateFields()
      if (kind === 'note') await saveNote(values)
      else if (kind === 'measurement') await saveMeasurement(values)
      else if (kind === 'medication') await saveMedication(values)
      else if (kind === 'agenda') await saveAgenda(values)
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'thread_required') {
          message.warning(t('quickCapture.threadRequired'))
          return
        }
        if (err.message !== 'empty') {
          message.error(err.message || t('quickCapture.error'))
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const renderForm = () => {
    if (kind === 'note') {
      return (
        <>
          <Form.Item name="body" label={t('quickCapture.noteLabel')} rules={[{ required: true, message: t('quickCapture.noteRequired') }]}>
            <Input.TextArea rows={4} placeholder={t('quickCapture.notePlaceholder')} />
          </Form.Item>
          <Form.Item name="healthThreadId" label={t('measurement.acompanhamento')}>
            <Select allowClear loading={threadsLoading} options={threadOptions} placeholder={t('measurement.optionalThread')} />
          </Form.Item>
        </>
      )
    }
    if (kind === 'measurement') {
      return (
        <>
          <Form.Item name="observedAt" label={t('measurement.when')} initialValue={dayjs()} rules={[{ required: true }]}>
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="healthThreadId" label={t('measurement.acompanhamento')}>
            <Select allowClear loading={threadsLoading} options={threadOptions} placeholder={t('measurement.optionalThread')} />
          </Form.Item>
          <Form.Item name="temperature" label={t('measurement.type.temperature')}>
            <InputNumber min={30} max={45} step={0.1} style={{ width: '100%' }} addonAfter="°C" />
          </Form.Item>
          <Form.Item name="heartRate" label={t('measurement.type.heart_rate')}>
            <InputNumber min={20} max={250} style={{ width: '100%' }} addonAfter="bpm" />
          </Form.Item>
          <Form.Item name="spo2" label={t('measurement.type.spo2')}>
            <InputNumber min={50} max={100} style={{ width: '100%' }} addonAfter="%" />
          </Form.Item>
        </>
      )
    }
    if (kind === 'medication') {
      return (
        <>
          <Form.Item name="administeredAt" label={t('measurement.when')} initialValue={dayjs()} rules={[{ required: true }]}>
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="medicationName" label={t('medication.genericName')} rules={[{ required: true }]}>
            <AutoComplete options={COMMON_MEDS.map((m) => ({ value: m }))} placeholder={t('measurement.pickOrTypeMed')} filterOption />
          </Form.Item>
          <Form.Item name="doseGiven" label={t('measurement.dose')}>
            <Input placeholder="5 ml, 1 comprimido…" />
          </Form.Item>
          <Form.Item name="healthThreadId" label={t('measurement.acompanhamento')}>
            <Select allowClear loading={threadsLoading} options={threadOptions} />
          </Form.Item>
          <Form.Item name="notes" label={t('growth.notes')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </>
      )
    }
    if (kind === 'agenda') {
      return (
        <>
          <Form.Item name="title" label={t('agenda.title')} rules={[{ required: true }]}>
            <Input placeholder={t('agenda.titlePlaceholder')} />
          </Form.Item>
          <Form.Item name="kind" label={t('agenda.kind')} initialValue="reminder">
            <Select
              options={[
                { value: 'reminder', label: t('agenda.kind.reminder') },
                { value: 'appointment', label: t('agenda.kind.appointment') },
                { value: 'task', label: t('agenda.kind.task') },
              ]}
            />
          </Form.Item>
          <Form.Item name="scheduledAt" label={t('agenda.when')} initialValue={dayjs().add(1, 'hour').minute(0)} rules={[{ required: true }]}>
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label={t('agenda.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="healthThreadId" label={t('measurement.acompanhamento')}>
            <Select allowClear loading={threadsLoading} options={threadOptions} />
          </Form.Item>
        </>
      )
    }
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text type="secondary">{t('quickCapture.documentHint')}</Text>
        <Upload
          accept="image/*,.pdf"
          showUploadList={false}
          disabled={uploading || !patientId}
          beforeUpload={(file) => {
            void saveDocument(file)
            return false
          }}
        >
          <Button icon={<UploadOutlined />} loading={uploading} block type="primary">
            {t('quickCapture.uploadDocument')}
          </Button>
        </Upload>
      </Space>
    )
  }

  return (
    <Drawer
      title={t('quickCapture.title')}
      open={open}
      onClose={handleClose}
      width={420}
      destroyOnClose
      footer={
        kind === 'document' ? null : (
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={handleClose}>{t('common.cancel')}</Button>
            <Button type="primary" loading={saving} onClick={() => void handleSubmit()}>
              {t('common.save')}
            </Button>
          </Space>
        )
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            {t('quickCapture.patientLabel')}
          </Text>
          {patients.length > 0 && patientId ? (
            <AvaPatientLensSelect
              patients={patients}
              value={patientId}
              onChange={onPatientChange}
              routePatientId={routePatientId}
            />
          ) : (
            <Text>{t('quickCapture.noPatients')}</Text>
          )}
          {activePatient && (
            <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
              {activePatient.name}
            </Text>
          )}
        </div>

        <div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            {t('quickCapture.typeLabel')}
          </Text>
          <Space wrap>
            {KIND_OPTIONS.map((opt) => (
              <Button
                key={opt.kind}
                type={kind === opt.kind ? 'primary' : 'default'}
                icon={opt.icon}
                onClick={() => setKind(opt.kind)}
              >
                {t(opt.labelKey)}
              </Button>
            ))}
          </Space>
        </div>

        <Form form={form} layout="vertical" requiredMark="optional">
          {renderForm()}
        </Form>
      </Space>
    </Drawer>
  )
}
