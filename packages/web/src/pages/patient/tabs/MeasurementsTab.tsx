import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button, DatePicker, Form, Input, InputNumber, Select, Space, Table, Typography, Segmented, App, Tag, AutoComplete, Modal,
} from 'antd'
import { PlusOutlined, MedicineBoxOutlined, ThunderboltOutlined, FilePdfOutlined, NotificationOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { MaskedDatePicker } from '../../../components/ui/MaskedDatePicker.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import { MeasurementEvolutionView } from '../../../components/measurements/MeasurementEvolutionView.js'
import { MeasurementChartGrid } from '../../../components/measurements/MeasurementChartGrid.js'
import { WhoGrowthChartGrid } from '../../../components/measurements/WhoGrowthChartGrid.js'
import { MonitoringExportSheet } from '../../../components/measurements/MonitoringExportSheet.js'
import { requestCareReminderNotificationPermission } from '../../../hooks/useCareReminderNotifications.js'
import type { MeasurementChartSeries } from '../../../components/measurements/measurement-chart.types.js'
import { api } from '../../../lib/api.js'
import type { HealthThread, MonitoringExportReport, MonitoringTimelineRow } from '../../../lib/api.types.js'

interface Props {
  patientId: string
  patientName?: string
  birthDate?: string | null
  gender?: string | null
  monitoringAction?: {
    kind: 'vitals' | 'medication'
    reminderId: string
    healthThreadId?: string | null
  } | null
  onMonitoringActionHandled?: () => void
}

const COMMON_MEDS = ['Dipirona', 'Paracetamol', 'Ibuprofeno', 'Nimesulida']

export function MeasurementsTab({ patientId, patientName, birthDate, gender, monitoringAction, onMonitoringActionHandled }: Props) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [view, setView] = useState<'monitoring' | 'charts' | 'anthropometry'>('monitoring')
  const [threads, setThreads] = useState<HealthThread[]>([])
  const [healthThreadId, setHealthThreadId] = useState<string | undefined>()
  const [timeline, setTimeline] = useState<MonitoringTimelineRow[]>([])
  const [chartSeries, setChartSeries] = useState<MeasurementChartSeries[]>([])
  const [anthropometrySeries, setAnthropometrySeries] = useState<MeasurementChartSeries[]>([])
  const [loading, setLoading] = useState(true)

  const [vitalsOpen, setVitalsOpen] = useState(false)
  const [medOpen, setMedOpen] = useState(false)
  const [anthroOpen, setAnthroOpen] = useState(false)
  const [packOpen, setPackOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportReport, setExportReport] = useState<MonitoringExportReport | null>(null)
  const [pendingReminderId, setPendingReminderId] = useState<string | undefined>()
  const [importingGlucose, setImportingGlucose] = useState(false)

  const importGlucoseFromExams = async () => {
    setImportingGlucose(true)
    try {
      const result = await api.measurements.importGlucose(patientId)
      if (result.imported > 0) {
        message.success(t('measurement.glucoseImported', { count: result.imported }))
        load()
      } else {
        message.info(t('measurement.glucoseNone'))
      }
    } catch {
      message.error(t('measurement.error'))
    } finally {
      setImportingGlucose(false)
    }
  }

  const loadThreads = useCallback(() => {
    api.healthThreads.list(patientId, true).then(setThreads).catch(() => setThreads([]))
  }, [patientId])

  const load = useCallback(() => {
    setLoading(true)
    const q = { patientId, healthThreadId }
    Promise.all([
      api.measurements.timeline(q),
      api.measurements.chartSeries({ ...q, categories: 'vital_sign,lab_point' }),
      api.measurements.chartSeries({ ...q, categories: 'anthropometry' }),
    ])
      .then(([tl, vitals, anthro]) => {
        setTimeline(tl)
        setChartSeries(vitals.series)
        setAnthropometrySeries(anthro.series)
      })
      .catch(() => {
        setTimeline([])
        setChartSeries([])
        setAnthropometrySeries([])
      })
      .finally(() => setLoading(false))
  }, [patientId, healthThreadId])

  useEffect(() => { loadThreads() }, [loadThreads])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!monitoringAction) return
    if (monitoringAction.healthThreadId) setHealthThreadId(monitoringAction.healthThreadId)
    setPendingReminderId(monitoringAction.reminderId)
    if (monitoringAction.kind === 'vitals') setVitalsOpen(true)
    else setMedOpen(true)
    onMonitoringActionHandled?.()
  }, [monitoringAction, onMonitoringActionHandled])

  const completeReminderIfNeeded = async () => {
    if (!pendingReminderId) return
    try {
      await api.careReminders.complete(pendingReminderId)
    } finally {
      setPendingReminderId(undefined)
    }
  }

  const openExport = async () => {
    try {
      const report = await api.monitoringExport({ patientId, healthThreadId })
      setExportReport(report)
      setExportOpen(true)
    } catch {
      message.error(t('measurement.error'))
    }
  }

  const printExport = () => {
    window.print()
  }

  const threadOptions = useMemo(() =>
    threads.map((th) => ({ value: th.id, label: th.title || th.kind })),
  [threads])

  const timelineColumns = [
    {
      title: t('measurement.when'),
      dataIndex: 'at',
      width: 160,
      render: (v: string) => new Date(v).toLocaleString('pt-BR'),
    },
    {
      title: t('measurement.what'),
      key: 'what',
      render: (_: unknown, row: MonitoringTimelineRow) => (
        <Space>
          <Tag color={row.kind === 'medication' ? 'purple' : row.kind === 'symptom' ? 'orange' : 'blue'}>
            {t(row.labelKey)}
          </Tag>
          <span>{row.display}</span>
        </Space>
      ),
    },
    {
      title: t('growth.notes'),
      dataIndex: 'notes',
      ellipsis: true,
    },
  ]

  const logSymptom = async (typeCode: 'vomit' | 'stool_abnormal') => {
    try {
      await api.measurements.create({
        patientId,
        typeCode,
        observedAt: new Date().toISOString(),
        valueNumeric: 1,
        healthThreadId,
      })
      message.success(t('measurement.symptomLogged'))
      load()
    } catch {
      message.error(t('measurement.error'))
    }
  }

  return (
    <>
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }} size="middle">
        <Segmented
          value={view}
          onChange={(v) => setView(v as typeof view)}
          options={[
            { label: t('measurement.tabMonitoring'), value: 'monitoring' },
            { label: t('measurement.tabEvolution'), value: 'charts' },
            { label: t('measurement.tabAnthropometry'), value: 'anthropometry' },
          ]}
        />
        <Select
          allowClear
          placeholder={t('measurement.filterThread')}
          style={{ minWidth: 220 }}
          options={threadOptions}
          value={healthThreadId}
          onChange={(v) => setHealthThreadId(v)}
        />
        <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => setVitalsOpen(true)}>
          {t('measurement.logVitals')}
        </Button>
        <Button icon={<MedicineBoxOutlined />} onClick={() => setMedOpen(true)}>
          {t('measurement.logMedication')}
        </Button>
        <Button onClick={() => logSymptom('vomit')}>{t('measurement.type.vomit')}</Button>
        <Button onClick={() => logSymptom('stool_abnormal')}>{t('measurement.type.stool_abnormal')}</Button>
        <Button icon={<NotificationOutlined />} onClick={() => setPackOpen(true)} disabled={!healthThreadId}>
          {t('measurement.startMonitoring')}
        </Button>
        <Button icon={<FilePdfOutlined />} onClick={openExport}>
          {t('measurement.exportReport')}
        </Button>
      </Space>

      {view === 'monitoring' && (
        <Table
          dataSource={timeline}
          columns={timelineColumns}
          rowKey={(r) => `${r.kind}-${r.id}`}
          loading={loading}
          size="small"
          pagination={{ pageSize: 20 }}
        />
      )}

      {view === 'charts' && (
        <MeasurementEvolutionView
          patientId={patientId}
          series={chartSeries as MeasurementChartSeries[]}
          loading={loading}
          onImportGlucose={importGlucoseFromExams}
          importingGlucose={importingGlucose}
        />
      )}

      {view === 'anthropometry' && (
        <>
          <WhoGrowthChartGrid patientId={patientId} birthDate={birthDate} gender={gender} />
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAnthroOpen(true)}>
              {t('growth.new')}
            </Button>
          </div>
          <MeasurementChartGrid series={anthropometrySeries} />
        </>
      )}

      <EntityFormModal
        open={vitalsOpen}
        title={t('measurement.logVitals')}
        successMsg={t('measurement.vitalsSaved')}
        onClose={() => setVitalsOpen(false)}
        onSubmit={async (values) => {
          const observedAt = (values.observedAt as Dayjs).toISOString()
          const items = [
            { typeCode: 'temperature', valueNumeric: values.temperature as number | undefined },
            { typeCode: 'heart_rate', valueNumeric: values.heartRate as number | undefined },
            { typeCode: 'spo2', valueNumeric: values.spo2 as number | undefined },
          ].filter((i) => i.valueNumeric != null)
          if (!items.length) throw new Error('empty')
          await api.measurements.createBatch({
            patientId,
            observedAt,
            healthThreadId: (values.healthThreadId as string) ?? healthThreadId,
            items,
          })
          await completeReminderIfNeeded()
          load()
        }}
      >
        <Form.Item name="observedAt" label={t('measurement.when')} initialValue={dayjs()} rules={[{ required: true }]}>
          <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="healthThreadId" label={t('measurement.acompanhamento')} initialValue={healthThreadId}>
          <Select allowClear options={threadOptions} placeholder={t('measurement.optionalThread')} />
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
      </EntityFormModal>

      <EntityFormModal
        open={medOpen}
        title={t('measurement.logMedication')}
        successMsg={t('measurement.medSaved')}
        onClose={() => setMedOpen(false)}
        onSubmit={async (values) => {
          await api.medicationAdministrations.create({
            patientId,
            medicationName: values.medicationName as string,
            administeredAt: (values.administeredAt as Dayjs).toISOString(),
            doseGiven: values.doseGiven as string | undefined,
            healthThreadId: (values.healthThreadId as string) ?? healthThreadId,
            notes: values.notes as string | undefined,
          })
          await completeReminderIfNeeded()
          load()
        }}
      >
        <Form.Item name="administeredAt" label={t('measurement.when')} initialValue={dayjs()} rules={[{ required: true }]}>
          <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="medicationName" label={t('medication.genericName')} rules={[{ required: true }]}>
          <AutoComplete
            options={COMMON_MEDS.map((m) => ({ value: m }))}
            placeholder={t('measurement.pickOrTypeMed')}
            filterOption
          />
        </Form.Item>
        <Form.Item name="doseGiven" label={t('measurement.dose')}>
          <Input placeholder="5 ml, 1 comprimido…" />
        </Form.Item>
        <Form.Item name="healthThreadId" label={t('measurement.acompanhamento')} initialValue={healthThreadId}>
          <Select allowClear options={threadOptions} />
        </Form.Item>
        <Form.Item name="notes" label={t('growth.notes')}>
          <Input.TextArea rows={2} />
        </Form.Item>
      </EntityFormModal>

      <EntityFormModal
        open={anthroOpen}
        title={t('growth.new')}
        successMsg={t('growth.success')}
        onClose={() => setAnthroOpen(false)}
        onSubmit={async (values) => {
          const observedAt = (values.recordDate as Dayjs).toISOString()
          await api.measurements.createBatch({
            patientId,
            observedAt,
            healthThreadId,
            items: [
              { typeCode: 'weight', valueNumeric: values.weightKg as number | undefined },
              { typeCode: 'height', valueNumeric: values.heightCm as number | undefined },
              { typeCode: 'head_circumference', valueNumeric: values.headCircumferenceCm as number | undefined },
            ].filter((i) => i.valueNumeric != null),
          })
          load()
        }}
      >
        <Form.Item name="recordDate" label={t('growth.date')} rules={[{ required: true }]}>
          <MaskedDatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="weightKg" label={t('growth.weight')}><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="heightCm" label={t('growth.height')}><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="headCircumferenceCm" label={t('growth.headCircumference')}><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item>
      </EntityFormModal>

      <EntityFormModal
        open={packOpen}
        title={t('measurement.startMonitoring')}
        successMsg={t('measurement.monitoringStarted')}
        onClose={() => setPackOpen(false)}
        onSubmit={async (values) => {
          if (!healthThreadId) throw new Error('thread')
          await api.careReminders.createIllnessPack({
            patientId,
            healthThreadId,
            vitalsIntervalMinutes: values.vitalsIntervalMinutes as number | undefined,
            medicationName: values.medicationName as string | undefined,
            medicationIntervalMinutes: values.medicationIntervalMinutes as number | undefined,
            doseHint: values.doseHint as string | undefined,
          })
          await requestCareReminderNotificationPermission()
        }}
      >
        <Form.Item name="vitalsIntervalMinutes" label={t('measurement.vitalsInterval')} initialValue={240}>
          <InputNumber min={60} max={720} step={30} style={{ width: '100%' }} addonAfter="min" />
        </Form.Item>
        <Form.Item name="medicationName" label={t('medication.genericName')}>
          <AutoComplete options={COMMON_MEDS.map((m) => ({ value: m }))} />
        </Form.Item>
        <Form.Item name="medicationIntervalMinutes" label={t('measurement.medInterval')} initialValue={360}>
          <InputNumber min={60} max={720} step={30} style={{ width: '100%' }} addonAfter="min" />
        </Form.Item>
        <Form.Item name="doseHint" label={t('measurement.dose')}>
          <Input placeholder="5 ml, gotas…" />
        </Form.Item>
      </EntityFormModal>

      <Modal
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        width={960}
        title={t('measurement.exportReport')}
        footer={[
          <Button key="print" type="primary" onClick={printExport}>{t('measurement.print')}</Button>,
          <Button key="close" onClick={() => setExportOpen(false)}>Fechar</Button>,
        ]}
      >
        {exportReport && (
          <MonitoringExportSheet
            report={exportReport}
            patientName={patientName ?? 'Paciente'}
            threadTitle={threads.find((th) => th.id === healthThreadId)?.title}
          />
        )}
      </Modal>
    </>
  )
}
