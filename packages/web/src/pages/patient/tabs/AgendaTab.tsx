import { useMemo, useState, useEffect, useRef } from 'react'
import {
  Button, Card, Form, Input, Select, Space, Table, Tag, Typography, Popconfirm, DatePicker, App, Segmented, Calendar,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { PlusOutlined, CheckOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined, CalendarOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import { AgendaTimelineHeader } from '../../../components/patient/AgendaTimelineHeader.js'
import {
  AGENDA_KIND_DISPLAY_ORDER,
  groupAgendaEventsByKind,
} from '../../../components/patient/PatientContextTimeline.js'
import { DismissibleHint } from '../../../components/ui/DismissibleHint.js'
import type { HealthThread, ScheduledEvent } from '../../../lib/api.types.js'
import { ensureAccessToken } from '../../../lib/supabase.js'
import '../../../components/patient/agenda-calendar.css'

import { formatCalendarDayLong, formatCalendarMonth } from '../../../lib/dayjs-locale.js'
import { GoogleCalendarConnectCard } from '../../../components/calendar/GoogleCalendarConnectCard.js'
import { OutlookCalendarConnectCard } from '../../../components/calendar/OutlookCalendarConnectCard.js'

interface Props { patientId: string }

const KIND_COLORS: Record<string, string> = {
  appointment: '#2563eb',
  reminder: '#d97706',
  task: '#7c3aed',
}

const MAX_MARKS_PER_CELL = 6

function eventFormValues(event: ScheduledEvent) {
  return {
    title: event.title,
    description: event.description ?? undefined,
    healthThreadId: event.healthThreadId ?? undefined,
    scheduledAt: dayjs(event.scheduledAt),
    endAt: event.endAt ? dayjs(event.endAt) : undefined,
    kind: event.kind,
    status: event.status,
  }
}

function defaultScheduledAtForDay(date: Dayjs): Dayjs {
  const atNine = date.hour(9).minute(0).second(0).millisecond(0)
  if (date.isSame(dayjs(), 'day') && atNine.isBefore(dayjs())) {
    return dayjs().add(1, 'hour').startOf('hour')
  }
  return atNine
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function AgendaTab({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const { message } = App.useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data, loading, reload } = usePatientEntity<ScheduledEvent>(
    api.scheduledEvents.list,
    patientId,
  )
  const [threads, setThreads] = useState<HealthThread[]>([])
  const [open, setOpen] = useState(false)
  const [createInitialValues, setCreateInitialValues] = useState<Record<string, unknown> | undefined>()
  const [editing, setEditing] = useState<ScheduledEvent | null>(null)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [calendarValue, setCalendarValue] = useState<Dayjs>(() => dayjs())
  const [selectedDate, setSelectedDate] = useState<Dayjs>(() => dayjs())
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [importingIcs, setImportingIcs] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.healthThreads.list(patientId, true).then(setThreads).catch(() => setThreads([]))
  }, [patientId])

  useEffect(() => {
    const cal = searchParams.get('calendar')
    if (cal === 'connected') {
      message.success(t('calendar.connected'))
      reload()
      searchParams.delete('calendar')
      setSearchParams(searchParams, { replace: true })
    }
    if (cal === 'error') {
      message.error(t('calendar.connectError'))
      searchParams.delete('calendar')
      searchParams.delete('reason')
      setSearchParams(searchParams, { replace: true })
    }
  }, [message, reload, searchParams, setSearchParams, t])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ScheduledEvent[]>()
    for (const e of data) {
      const key = dayjs(e.scheduledAt).format('YYYY-MM-DD')
      const list = map.get(key) ?? []
      list.push(e)
      map.set(key, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    }
    return map
  }, [data])

  const selectedDayEvents = useMemo(() => {
    return eventsByDay.get(selectedDate.format('YYYY-MM-DD')) ?? []
  }, [eventsByDay, selectedDate])

  const selectedDayByKind = useMemo(
    () => groupAgendaEventsByKind(selectedDayEvents),
    [selectedDayEvents],
  )

  const kindMarksForDay = (items: ScheduledEvent[]) => {
    const byKind = groupAgendaEventsByKind(items)
    return AGENDA_KIND_DISPLAY_ORDER
      .map((kind) => ({ kind, items: byKind.get(kind) ?? [] }))
      .filter((mark) => mark.items.length > 0)
  }

  const selectedEvent = useMemo(
    () => data.find((e) => e.id === selectedEventId) ?? null,
    [data, selectedEventId],
  )

  const upcoming = useMemo(() => {
    const now = Date.now()
    return data
      .filter((e) => e.status === 'planned' && new Date(e.scheduledAt).getTime() >= now - 86400000)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  }, [data])

  const past = useMemo(() => {
    const now = Date.now()
    return data
      .filter((e) => e.status !== 'planned' || new Date(e.scheduledAt).getTime() < now - 86400000)
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
  }, [data])

  const selectDay = (date: Dayjs, clearEvent = true) => {
    setSelectedDate(date)
    if (clearEvent) setSelectedEventId(null)
  }

  const selectEvent = (date: Dayjs, event: ScheduledEvent) => {
    setSelectedDate(date)
    setSelectedEventId(event.id)
  }

  const openCreateModal = (day: Dayjs = selectedDate) => {
    setCreateInitialValues({
      kind: 'reminder',
      scheduledAt: defaultScheduledAtForDay(day),
    })
    setOpen(true)
  }

  const closeCreateModal = () => {
    setOpen(false)
    setCreateInitialValues(undefined)
  }

  const buildPayload = (values: Record<string, unknown>) => ({
    title: values.title as string,
    description: (values.description as string | undefined) || undefined,
    healthThreadId: (values.healthThreadId as string | undefined) || undefined,
    scheduledAt: (values.scheduledAt as Dayjs).toISOString(),
    endAt: (values.endAt as Dayjs | undefined)?.toISOString(),
    kind: values.kind as ScheduledEvent['kind'],
    status: values.status as ScheduledEvent['status'] | undefined,
  })

  const handleCreate = async (values: Record<string, unknown>) => {
    await api.scheduledEvents.create({ patientId, ...buildPayload(values) })
    reload()
  }

  const handleUpdate = async (values: Record<string, unknown>) => {
    if (!editing) return
    await api.scheduledEvents.update(editing.id, buildPayload(values))
    setEditing(null)
    setSelectedEventId(null)
    reload()
  }

  const markDone = async (event: ScheduledEvent) => {
    await api.scheduledEvents.update(event.id, { status: 'done' })
    message.success(t('agenda.done'))
    reload()
  }

  const handleDelete = async (id: string) => {
    await api.scheduledEvents.delete(id)
    message.success(t('agenda.deleted'))
    setSelectedEventId(null)
    reload()
  }

  const downloadIcs = async () => {
    try {
      const token = await ensureAccessToken()
      const base = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:3010')
      const res = await fetch(`${base}/scheduled-events/export/ics?patientId=${patientId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `agenda-${patientId}.ics`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('agenda.exportError'))
    }
  }

  const importIcsFile = async (file: File) => {
    setImportingIcs(true)
    try {
      const ics = await file.text()
      const result = await api.scheduledEvents.importIcs({ patientId, ics })
      message.success(
        t('agenda.importSuccess', {
          imported: result.imported,
          skipped: result.skippedDuplicate,
        }),
      )
      reload()
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('agenda.importError'))
    } finally {
      setImportingIcs(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const renderEventDetail = (e: ScheduledEvent) => (
    <div className="agenda-day-event">
      <span className="agenda-day-event__time">
        {new Date(e.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        {e.endAt && ` – ${new Date(e.endAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
      </span>
      <div className="agenda-day-event__title">{e.title}</div>
      <Space wrap size={4} style={{ marginTop: 6 }}>
        <Tag color={KIND_COLORS[e.kind]}>{t(`agenda.kind.${e.kind}`)}</Tag>
        {e.status !== 'planned' && <Tag>{t(`agenda.status.${e.status}`)}</Tag>}
        {e.source !== 'local' && (
          <Tag color="geekblue">{e.sourceLabel ?? t('agenda.externalSource')}</Tag>
        )}
        {e.healthThreadId && <Tag>{t('agenda.threadLinked')}</Tag>}
      </Space>
      {e.description && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 6, fontSize: 12 }}>
          {e.description}
        </Typography.Paragraph>
      )}
      <Space size={4} style={{ marginTop: 8 }}>
        {e.status === 'planned' && (
          <Button size="small" icon={<CheckOutlined />} onClick={() => markDone(e)}>
            {t('agenda.markDone')}
          </Button>
        )}
        <Button type="link" size="small" onClick={() => setEditing(e)}>{t('common.edit')}</Button>
        <Popconfirm title={t('agenda.deleteConfirm')} onConfirm={() => handleDelete(e.id)}>
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    </div>
  )

  const columns = [
    {
      title: t('agenda.when'),
      dataIndex: 'scheduledAt',
      render: (v: string) => new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    },
    {
      title: t('agenda.title'),
      dataIndex: 'title',
      render: (v: string, r: ScheduledEvent) => (
        <Space wrap size={4}>
          <Typography.Text strong={r.status === 'planned'}>{v}</Typography.Text>
          <Tag color={KIND_COLORS[r.kind]}>{t(`agenda.kind.${r.kind}`)}</Tag>
          {r.source !== 'local' && (
            <Tag color="geekblue">{r.sourceLabel ?? t('agenda.externalSource')}</Tag>
          )}
          {r.healthThreadId && <Tag>{t('agenda.threadLinked')}</Tag>}
        </Space>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 140,
      render: (_: unknown, r: ScheduledEvent) => (
        <Space size={4}>
          {r.status === 'planned' && (
            <Button type="text" icon={<CheckOutlined />} onClick={() => markDone(r)} />
          )}
          <Button type="link" size="small" onClick={() => setEditing(r)}>{t('common.edit')}</Button>
          <Popconfirm title={t('agenda.deleteConfirm')} onConfirm={() => handleDelete(r.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const formFields = (
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
      <Form.Item name="healthThreadId" label={t('agenda.thread')}>
        <Select
          allowClear
          placeholder={t('agenda.threadPlaceholder')}
          options={threads.map((th) => ({ value: th.id, label: th.title }))}
        />
      </Form.Item>
      <Form.Item name="scheduledAt" label={t('agenda.when')} rules={[{ required: true }]}>
        <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="endAt" label={t('agenda.end')}>
        <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="description" label={t('agenda.description')}>
        <Input.TextArea rows={3} />
      </Form.Item>
      {editing && (
        <Form.Item name="status" label={t('agenda.status')}>
          <Select
            options={[
              { value: 'planned', label: t('agenda.status.planned') },
              { value: 'done', label: t('agenda.status.done') },
              { value: 'cancelled', label: t('agenda.status.cancelled') },
            ]}
          />
        </Form.Item>
      )}
    </>
  )

  const fullCellRender = (date: Dayjs) => {
    const key = date.format('YYYY-MM-DD')
    const items = eventsByDay.get(key) ?? []
    const kindMarks = kindMarksForDay(items)
    const visibleMarks = kindMarks.slice(0, MAX_MARKS_PER_CELL)
    const isToday = date.isSame(dayjs(), 'day')
    const isSelected = date.isSame(selectedDate, 'day')
    const isCurrentMonth = date.isSame(calendarValue, 'month')

    return (
      <div
        className={[
          'agenda-cal-cell',
          isToday && 'agenda-cal-cell--today',
          isSelected && 'agenda-cal-cell--selected',
          !isCurrentMonth && 'agenda-cal-cell--other-month',
        ].filter(Boolean).join(' ')}
        onClick={() => selectDay(date)}
      >
        <div className="agenda-cal-cell__head">
          <span className="agenda-cal-day">{date.date()}</span>
          <button
            type="button"
            className="agenda-cal-add"
            aria-label={t('agenda.newOnDay')}
            title={t('agenda.newOnDay')}
            onClick={(ev) => {
              ev.stopPropagation()
              selectDay(date, false)
              openCreateModal(date)
            }}
          >
            <PlusOutlined />
          </button>
        </div>
        <div className="agenda-cal-marks" role="list" aria-label={t('agenda.dayEvents')}>
          {visibleMarks.map((mark) => (
            <button
              key={mark.kind}
              type="button"
              role="listitem"
              className="agenda-cal-mark agenda-cal-mark--kind"
              style={{ background: KIND_COLORS[mark.kind] }}
              title={t('agenda.kindGroupCount', {
                kind: t(`agenda.kind.${mark.kind}`),
                count: mark.items.length,
              })}
              aria-label={t('agenda.kindGroupCount', {
                kind: t(`agenda.kind.${mark.kind}`),
                count: mark.items.length,
              })}
              onClick={(ev) => {
                ev.stopPropagation()
                selectDay(date)
              }}
            />
          ))}
          {kindMarks.length > MAX_MARKS_PER_CELL && (
            <span className="agenda-cal-more">+{kindMarks.length - MAX_MARKS_PER_CELL}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="agenda-tab">
      <DismissibleHint
        hintId="agenda.intro"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={t('agenda.hintTitle')}
        description={t('agenda.hint')}
      />

      <GoogleCalendarConnectCard patientId={patientId} onSynced={reload} />
      <OutlookCalendarConnectCard patientId={patientId} onSynced={reload} />

      <div className="agenda-toolbar">
        <Space wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => (view === 'calendar' ? openCreateModal() : openCreateModal(dayjs()))}
          >
            {t('agenda.new')}
          </Button>
          <Button icon={<DownloadOutlined />} onClick={downloadIcs}>
            {t('agenda.exportIcs')}
          </Button>
          <Button
            icon={<UploadOutlined />}
            loading={importingIcs}
            onClick={() => fileInputRef.current?.click()}
          >
            {t('agenda.importIcs')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics,text/calendar"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importIcsFile(file)
            }}
          />
        </Space>
        <Segmented
          value={view}
          onChange={(v) => setView(v as 'calendar' | 'list')}
          options={[
            { value: 'calendar', icon: <CalendarOutlined />, label: t('agenda.viewCalendar') },
            { value: 'list', icon: <UnorderedListOutlined />, label: t('agenda.viewList') },
          ]}
        />
      </div>

      <AgendaTimelineHeader patientId={patientId} />

      {view === 'calendar' ? (
        <div className="agenda-main">
          <Card className="agenda-calendar-card" bordered>
            <Calendar
              fullscreen
              value={calendarValue}
              onPanelChange={(v) => setCalendarValue(v)}
              onSelect={(date) => {
                setCalendarValue(date)
                selectDay(date)
              }}
              fullCellRender={fullCellRender}
              headerRender={({ value, onChange }) => (
                <div className="agenda-cal-header">
                  <Space>
                    <Button size="small" onClick={() => onChange(value.subtract(1, 'month'))}>‹</Button>
                    <Button size="small" onClick={() => onChange(dayjs())}>{t('agenda.today')}</Button>
                    <Button size="small" onClick={() => onChange(value.add(1, 'month'))}>›</Button>
                  </Space>
                  <Typography.Title level={4} className="agenda-cal-header__title">
                    {formatCalendarMonth(value, i18n.language)}
                  </Typography.Title>
                  <div />
                </div>
              )}
            />
          </Card>

          <Card
            className="agenda-day-panel"
            title={selectedEvent ? t('agenda.eventPanel') : t('agenda.dayPanel')}
            bordered
            loading={loading}
          >
            <Typography.Text type="secondary" className="agenda-day-panel__date">
              {formatCalendarDayLong(selectedDate, i18n.language)}
            </Typography.Text>

            {selectedEvent ? (
              renderEventDetail(selectedEvent)
            ) : selectedDayEvents.length === 0 ? (
              <Typography.Text type="secondary">{t('agenda.emptyDayHint')}</Typography.Text>
            ) : (
              <div className="agenda-day-list">
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                  {t('agenda.pickEventHint')}
                </Typography.Text>
                {AGENDA_KIND_DISPLAY_ORDER.map((kind) => {
                  const items = selectedDayByKind.get(kind)
                  if (!items?.length) return null
                  return (
                    <div key={kind} className="agenda-day-kind-group">
                      <Typography.Text strong className="agenda-day-kind-group__title">
                        {t('agenda.kindGroupCount', {
                          kind: t(`agenda.kind.${kind}`),
                          count: items.length,
                        })}
                      </Typography.Text>
                      {items.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          className={[
                            'agenda-day-list__item',
                            selectedEventId === e.id && 'agenda-day-list__item--active',
                          ].filter(Boolean).join(' ')}
                          onClick={() => selectEvent(selectedDate, e)}
                        >
                          <span
                            className="agenda-day-list__mark"
                            style={{ background: KIND_COLORS[e.kind] }}
                            aria-hidden
                          />
                          <span className="agenda-day-list__time">{formatEventTime(e.scheduledAt)}</span>
                          <span className="agenda-day-list__title">{e.title}</span>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="agenda-list-section">
          <Typography.Title level={5}>{t('agenda.upcoming')}</Typography.Title>
          <Table dataSource={upcoming} columns={columns} rowKey="id" loading={loading} pagination={false} size="small" />
          {past.length > 0 && (
            <>
              <Typography.Title level={5} style={{ marginTop: 24 }}>{t('agenda.past')}</Typography.Title>
              <Table dataSource={past} columns={columns} rowKey="id" pagination={false} size="small" />
            </>
          )}
        </div>
      )}

      <EntityFormModal
        open={open}
        title={t('agenda.new')}
        successMsg={t('agenda.success')}
        initialValues={createInitialValues}
        onClose={closeCreateModal}
        onSubmit={handleCreate}
      >
        {formFields}
      </EntityFormModal>
      <EntityFormModal
        open={!!editing}
        title={t('agenda.edit')}
        initialValues={editing ? eventFormValues(editing) : undefined}
        successMsg={t('agenda.updated')}
        onClose={() => setEditing(null)}
        onSubmit={handleUpdate}
      >
        {formFields}
      </EntityFormModal>
    </div>
  )
}
