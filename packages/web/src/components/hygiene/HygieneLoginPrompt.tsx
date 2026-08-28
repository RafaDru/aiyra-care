import { useCallback, useEffect, useState } from 'react'
import { Button, Modal, Space, Typography, App } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext.js'
import { api } from '../../lib/api.js'
import type { HygieneCandidateItem } from '../../lib/api.types.js'
import { isHygienePromptSnoozed, snoozeHygienePrompt } from '../../lib/hygiene-prompt-storage.js'
import { COMPLIANCE_ACCEPT_PATH } from '../../lib/legal-paths.js'

const { Text, Paragraph } = Typography

function formatDate(value: unknown): string | null {
  if (!value) return null
  const s = String(value)
  return s.length >= 10 ? s.slice(0, 10) : s
}

function formatEntityLine(
  entityType: string,
  entity: Record<string, unknown>,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (entity.missing) return t('hygiene.recordMissing')
  const source = entity.source ? t('hygiene.sourceLabel', { source: String(entity.source) }) : null
  if (entityType === 'vaccine') {
    const parts = [
      entity.vaccineName,
      formatDate(entity.applicationDate),
      entity.doseNumber != null ? t('hygiene.doseLabel', { dose: entity.doseNumber }) : null,
      entity.clinic,
      entity.batchNumber ? t('hygiene.batchLabel', { batch: entity.batchNumber }) : null,
      source,
    ]
    return parts.filter(Boolean).join(' · ') || t('hygiene.entityTypes.vaccine')
  }
  if (entityType === 'exam') {
    const parts = [
      entity.examType,
      formatDate(entity.examDate),
      entity.laboratory,
      entity.resultSummary,
      source,
    ]
    return parts.filter(Boolean).join(' · ') || t('hygiene.entityTypes.exam')
  }
  return String(entity.id ?? t('hygiene.genericRecord'))
}

function formatEvidenceSummary(
  item: HygieneCandidateItem,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string | null {
  const evidence = item.evidence ?? {}
  const parts: string[] = []
  if (item.detector) parts.push(t('hygiene.detectorLabel', { detector: item.detector }))
  if (evidence.vaccineName) parts.push(String(evidence.vaccineName))
  if (evidence.examType) parts.push(String(evidence.examType))
  if (evidence.applicationDate) parts.push(formatDate(evidence.applicationDate) ?? '')
  if (evidence.catalogSlotKey) parts.push(t('hygiene.slotLabel', { slot: String(evidence.catalogSlotKey) }))
  const filtered = parts.filter(Boolean)
  return filtered.length ? filtered.join(' · ') : null
}

function EntityCard({
  label,
  entityType,
  entity,
  t,
}: {
  label: string
  entityType: string
  entity: Record<string, unknown>
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: 12,
        borderRadius: 8,
        border: '1px solid var(--border-subtle, rgba(0,0,0,0.08))',
        background: 'var(--surface-elevated, rgba(0,0,0,0.02))',
      }}
    >
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
      <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>{formatEntityLine(entityType, entity, t)}</Paragraph>
    </div>
  )
}

/**
 * Modal após login/compliance quando há candidatos de higienização pendentes (estilo Google Photos).
 */
export function HygieneLoginPrompt() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { configured, user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<HygieneCandidateItem[]>([])
  const [index, setIndex] = useState(0)
  const [resolving, setResolving] = useState(false)

  const current = items[index]
  const entityTypeLabel = current
    ? t(`hygiene.entityTypes.${current.entityType}`, { defaultValue: current.entityType })
    : ''

  const closeAndMaybeSnooze = useCallback((snooze: boolean) => {
    setOpen(false)
    if (snooze) snoozeHygienePrompt(24)
  }, [])

  useEffect(() => {
    if (!configured || !user) return
    if (location.pathname === COMPLIANCE_ACCEPT_PATH) return
    if (isHygienePromptSnoozed()) return

    let cancelled = false
    api.hygiene.listCandidates()
      .then((res) => {
        if (cancelled || res.pendingCount === 0 || res.items.length === 0) return
        setItems(res.items)
        setIndex(0)
        setOpen(true)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [configured, user, location.pathname])

  const advanceAfterResolve = useCallback((resolvedId: string, decision: 'same_entity' | 'distinct' | 'dismissed') => {
    setItems((prev) => {
      const remaining = prev.filter((item) => item.id !== resolvedId)
      if (remaining.length === 0) {
        setOpen(false)
        message.success(t(`hygiene.resolveSuccess.${decision}`))
      } else {
        setIndex((i) => Math.min(i, remaining.length - 1))
        message.success(t(`hygiene.resolveSuccess.${decision}`))
      }
      return remaining
    })
  }, [message, t])

  const resolve = async (decision: 'same_entity' | 'distinct' | 'dismissed') => {
    if (!current || resolving) return
    setResolving(true)
    try {
      await api.hygiene.resolve(current.id, decision)
      advanceAfterResolve(current.id, decision)
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      message.error(t('hygiene.resolveFailed', { message: errMsg }))
    } finally {
      setResolving(false)
    }
  }

  if (!current) return null

  const entityA = current.entityA ?? { id: current.entityIdA }
  const entityB = current.entityB ?? { id: current.entityIdB }
  const evidenceSummary = formatEvidenceSummary(current, t)
  const progressLabel = t('hygiene.progressLabel', {
    current: index + 1,
    total: items.length,
  })

  return (
    <Modal
      open={open}
      title={t('hygiene.loginPromptTitle')}
      onCancel={() => closeAndMaybeSnooze(true)}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Paragraph type="secondary" style={{ marginBottom: 8 }}>
        {t('hygiene.loginPromptBody', { count: items.length })}
      </Paragraph>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
        {progressLabel}
      </Text>
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          borderRadius: 8,
          background: 'var(--surface-elevated, rgba(0,0,0,0.03))',
        }}
      >
        <Text strong style={{ display: 'block' }}>
          {t('hygiene.patientLabel', { name: current.patientName ?? t('hygiene.patientUnknown') })}
        </Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {t('hygiene.entityTypeLabel', { type: entityTypeLabel })}
        </Text>
        {evidenceSummary && (
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 13 }}>
            {evidenceSummary}
          </Paragraph>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <EntityCard label={t('hygiene.recordA')} entityType={current.entityType} entity={entityA} t={t} />
        <EntityCard label={t('hygiene.recordB')} entityType={current.entityType} entity={entityB} t={t} />
      </div>
      {current.score > 0 && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
          {t('hygiene.similarityHint', { score: Math.round(current.score * 100) })}
        </Text>
      )}
      <Space wrap>
        <Button type="primary" loading={resolving} onClick={() => resolve('same_entity')}>
          {t('hygiene.sameEntity')}
        </Button>
        <Button loading={resolving} onClick={() => resolve('distinct')}>
          {t('hygiene.distinct')}
        </Button>
        <Button loading={resolving} onClick={() => resolve('dismissed')}>
          {t('hygiene.dismiss')}
        </Button>
        <Button type="link" onClick={() => closeAndMaybeSnooze(true)}>
          {t('hygiene.later')}
        </Button>
      </Space>
      <div style={{ marginTop: 12 }}>
        <Link to={`/patients/${current.patientId}?section=clinical`}>
          {t('hygiene.openPatient')}
        </Link>
      </div>
    </Modal>
  )
}
