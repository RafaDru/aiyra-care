import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Drawer,
  Timeline,
  Typography,
  Input,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  message,
  Spin,
} from 'antd'
import { api } from '../../lib/api.js'
import type { HealthThreadDetail, HealthThreadTimelineItem, ScheduledEvent } from '../../lib/api.types.js'
import { MaskedDatePicker } from '../ui/MaskedDatePicker.js'
import type { Dayjs } from 'dayjs'
import { AIYRACARE_TOKENS } from '../../theme/aiyracare-tokens.js'
import { HealthThreadArtifactActions } from './HealthThreadArtifactActions.js'
import {
  ENTITY_TYPE_LABEL,
  LINK_ROLE_META,
  type HealthThreadLinkRole,
} from './health-thread-link-roles.js'
import { healthThreadKindLabel } from './health-thread-kinds.js'
import { ClinicalEntityFlow } from './ClinicalEntityFlow.js'
import { ClinicalLinkModal } from './ClinicalLinkModal.js'
import type { ClinicalFlow } from '../../lib/api.types.js'
import { CLINICAL_SEQUENCE_COPY } from './clinical-sequence-copy.js'
import { ClinicalSequenceSectionHeader } from './ClinicalSequenceSectionHeader.js'

const { Text, Paragraph } = Typography

interface Props {
  threadId: string | null
  patientId: string
  open: boolean
  onClose: () => void
  onUpdated?: () => void
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function timelineForDisplay(items: HealthThreadTimelineItem[]): HealthThreadTimelineItem[] {
  return items.filter((item) => item.kind === 'link' || item.entryType !== 'system')
}

function TimelineEventContent({ item }: { item: HealthThreadTimelineItem }) {
  const { t } = useTranslation()
  if (item.kind === 'entry') {
    return (
      <div>
        <Text style={{ fontSize: 12 }} type="secondary">{formatEventDate(item.occurredAt)}</Text>
        <div style={{ marginTop: 4 }}>
          <Tag>{t('clinicalSequence.timelineNoteTag')}</Tag>
          <Text>{item.body}</Text>
        </div>
      </div>
    )
  }

  const title = item.artifact?.title ?? item.entityType ?? t('clinicalSequence.artifactFallback')
  const roleMeta = item.linkRole
    ? LINK_ROLE_META[item.linkRole as HealthThreadLinkRole]
    : undefined
  const linkedLater =
    item.linkedAt &&
    item.occurredAt.slice(0, 10) !== item.linkedAt.slice(0, 10)

  return (
    <div>
      <Text style={{ fontSize: 12 }} type="secondary">
        {formatEventDate(item.occurredAt)}
        {linkedLater && (
          <> · {t('clinicalSequence.linkedOn', { date: formatEventDate(item.linkedAt!) })}</>
        )}
      </Text>
      <Space size={4} wrap style={{ marginTop: 4, marginBottom: 4 }}>
        {item.entityType && (
          <Tag color={AIYRACARE_TOKENS.colorPrimary}>
            {ENTITY_TYPE_LABEL[item.entityType] ?? item.entityType}
          </Tag>
        )}
        {roleMeta && <Tag>{roleMeta.label}</Tag>}
      </Space>
      <Text strong style={{ display: 'block' }}>{title}</Text>
      {item.artifact?.subtitle && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          {item.artifact.subtitle}
        </Text>
      )}
      {roleMeta && (
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
          {roleMeta.hint}
        </Text>
      )}
    </div>
  )
}

export function HealthThreadDrawer({ threadId, patientId, open, onClose, onUpdated }: Props) {
  const { t } = useTranslation()
  const [detail, setDetail] = useState<HealthThreadDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [convertAllergyOpen, setConvertAllergyOpen] = useState(false)
  const [convertDiagnosisOpen, setConvertDiagnosisOpen] = useState(false)
  const [clinicalFlow, setClinicalFlow] = useState<ClinicalFlow | null>(null)
  const [threadEvents, setThreadEvents] = useState<ScheduledEvent[]>([])
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [allergyForm] = Form.useForm()
  const [diagnosisForm] = Form.useForm()

  const loadFlow = useCallback(() => {
    if (!threadId) return
    api.healthThreads
      .clinicalFlow(threadId)
      .then(setClinicalFlow)
      .catch(() => setClinicalFlow(null))
  }, [threadId])

  const load = useCallback(() => {
    if (!threadId) return
    setLoading(true)
    api.healthThreads
      .detail(threadId)
      .then(setDetail)
      .catch(() => message.error(CLINICAL_SEQUENCE_COPY.drawerLoadError))
      .finally(() => setLoading(false))
    loadFlow()
    api.scheduledEvents.list(patientId, { healthThreadId: threadId })
      .then(setThreadEvents)
      .catch(() => setThreadEvents([]))
  }, [threadId, patientId, loadFlow])

  useEffect(() => {
    if (open && threadId) load()
    if (!open) setDetail(null)
  }, [open, threadId, load])

  const addNote = async () => {
    if (!threadId || !note.trim()) return
    setNoteLoading(true)
    try {
      await api.healthThreads.addEntry(threadId, note.trim())
      setNote('')
      load()
      onUpdated?.()
      message.success(CLINICAL_SEQUENCE_COPY.noteSaved)
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setNoteLoading(false)
    }
  }

  const confirmAllergy = async () => {
    if (!threadId) return
    const values = await allergyForm.validateFields()
    try {
      await api.healthThreads.convertAllergy(threadId, values)
      setConvertAllergyOpen(false)
      allergyForm.resetFields()
      onUpdated?.()
      message.success(CLINICAL_SEQUENCE_COPY.allergyConverted)
      onClose()
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const confirmDiagnosis = async () => {
    if (!threadId) return
    const values = await diagnosisForm.validateFields()
    try {
      await api.healthThreads.convertDiagnosis(threadId, {
        ...values,
        diagnosedDate: (values.diagnosedDate as Dayjs | undefined)?.toISOString(),
      })
      setConvertDiagnosisOpen(false)
      diagnosisForm.resetFields()
      onUpdated?.()
      message.success(CLINICAL_SEQUENCE_COPY.diagnosisConverted)
      onClose()
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const thread = detail?.thread
  const displayTimeline = detail ? timelineForDisplay(detail.timeline) : []

  return (
    <>
      <Drawer
        title={thread?.title ?? CLINICAL_SEQUENCE_COPY.drawerFallbackTitle}
        open={open}
        onClose={onClose}
        width={480}
        extra={
          thread && (
            <Tag color={AIYRACARE_TOKENS.colorPrimary}>
              {healthThreadKindLabel(thread.kind)}
            </Tag>
          )
        }
      >
        {loading || !detail ? (
          <Spin style={{ display: 'block', margin: '40px auto' }} />
        ) : thread ? (
          <>
            {thread.summary && (
              <Paragraph type="secondary" style={{ marginBottom: 16 }}>{thread.summary}</Paragraph>
            )}

            <HealthThreadArtifactActions
              threadId={threadId}
              patientId={patientId}
              onUpdated={onUpdated}
              onReload={load}
            />

            {threadEvents.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <ClinicalSequenceSectionHeader title={t('modals.linkedAgenda')} />
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {threadEvents.map((ev) => (
                    <div key={ev.id}>
                      <Text strong>{ev.title}</Text>
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                        {new Date(ev.scheduledAt).toLocaleString('pt-BR')}
                      </Text>
                      {ev.status !== 'planned' && <Tag style={{ marginLeft: 8 }}>{ev.status}</Tag>}
                    </div>
                  ))}
                </Space>
              </div>
            )}

            {(thread.kind === 'task' || thread.kind === 'investigation') && (
              <div style={{ marginBottom: 16 }}>
                {clinicalFlow && (
                  <ClinicalEntityFlow
                    flow={clinicalFlow}
                    onRemoveLink={async (linkId) => {
                      try {
                        await api.clinicalLinks.delete(linkId)
                        message.success(CLINICAL_SEQUENCE_COPY.removed)
                        load()
                      } catch (e) {
                        message.error(e instanceof Error ? e.message : t('clinicalSequence.removeLinkError'))
                      }
                    }}
                  />
                )}
                <Button
                  size="small"
                  type="default"
                  style={{ marginTop: 12 }}
                  onClick={() => setLinkModalOpen(true)}
                  disabled={!clinicalFlow || clinicalFlow.nodes.length < 2}
                  title={CLINICAL_SEQUENCE_COPY.connectButtonHint}
                >
                  {CLINICAL_SEQUENCE_COPY.connectButton}
                </Button>
              </div>
            )}

            <Space wrap style={{ marginBottom: 16 }}>
              {thread.kind === 'hypothesis' && (
                <Button size="small" type="primary" ghost onClick={() => setConvertAllergyOpen(true)}>
                  {t('clinicalSequence.confirmAllergyAction')}
                </Button>
              )}
              {(thread.kind === 'hypothesis' || thread.kind === 'investigation') && (
                <Button size="small" onClick={() => setConvertDiagnosisOpen(true)}>
                  {t('clinicalSequence.registerDiagnosisAction')}
                </Button>
              )}
            </Space>

            {displayTimeline.length > 0 && (
              <>
                <ClinicalSequenceSectionHeader
                  title={CLINICAL_SEQUENCE_COPY.timelineSectionTitle}
                  icon={false}
                />
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  {CLINICAL_SEQUENCE_COPY.timelineSectionHint}
                </Text>
                <Timeline
                  style={{ marginTop: 4 }}
                  items={displayTimeline.map((item) => ({
                    color: item.kind === 'link' ? AIYRACARE_TOKENS.colorPrimary : 'gray',
                    children: <TimelineEventContent item={item} />,
                  }))}
                />
              </>
            )}

            <div style={{ marginTop: 24 }}>
              <Text strong>{CLINICAL_SEQUENCE_COPY.noteSectionTitle}</Text>
              <Input.TextArea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={CLINICAL_SEQUENCE_COPY.notePlaceholder}
                style={{ marginTop: 8 }}
              />
              <Button
                type="primary"
                size="small"
                style={{ marginTop: 8 }}
                loading={noteLoading}
                onClick={() => addNote()}
              >
                {t('clinicalSequence.saveNote')}
              </Button>
            </div>
          </>
        ) : (
          <Text type="secondary">{CLINICAL_SEQUENCE_COPY.drawerNotFound}</Text>
        )}
      </Drawer>

      <Modal
        open={convertAllergyOpen}
        title={t('modals.confirmAllergy')}
        onCancel={() => setConvertAllergyOpen(false)}
        onOk={() => confirmAllergy()}
        okText={t('common.confirm')}
        destroyOnClose
      >
        <Form form={allergyForm} layout="vertical">
          <Form.Item name="allergen" label={t('allergy.allergen')} rules={[{ required: true }]}>
            <Input placeholder={t('form.allergen')} />
          </Form.Item>
          <Form.Item name="reaction" label={t('allergy.reaction')}>
            <Input />
          </Form.Item>
          <Form.Item name="severity" label={t('allergy.severity')}>
            <Select
              allowClear
              options={[
                { value: 'leve', label: t('allergy.mild') },
                { value: 'moderada', label: t('allergy.moderate') },
                { value: 'grave', label: t('allergy.severe') },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={convertDiagnosisOpen}
        title={t('modals.registerDiagnosisClose')}
        onCancel={() => setConvertDiagnosisOpen(false)}
        onOk={() => confirmDiagnosis()}
        okText={t('common.save')}
        destroyOnClose
      >
        <Form form={diagnosisForm} layout="vertical" initialValues={{ status: 'active' }}>
          <Form.Item name="diagnosisName" label={t('diagnosis.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="diagnosisCode" label={t('diagnosis.code')}>
            <Input placeholder={t('form.icdExample')} />
          </Form.Item>
          <Form.Item name="description" label={t('medication.notes')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="diagnosedDate" label={t('diagnosis.date')}>
            <MaskedDatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <ClinicalLinkModal
        open={linkModalOpen}
        patientId={patientId}
        healthThreadId={threadId ?? undefined}
        flow={clinicalFlow}
        onClose={() => setLinkModalOpen(false)}
        onCreated={() => {
          message.success(CLINICAL_SEQUENCE_COPY.created)
          load()
          onUpdated?.()
        }}
      />
    </>
  )
}
