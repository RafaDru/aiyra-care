import { useCallback, useEffect, useState } from 'react'
import { Button, Modal, Space, Typography } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext.js'
import { api } from '../../lib/api.js'
import type { HygieneCandidateItem } from '../../lib/api.types.js'
import { isHygienePromptSnoozed, snoozeHygienePrompt } from '../../lib/hygiene-prompt-storage.js'
import { COMPLIANCE_ACCEPT_PATH } from '../../lib/legal-paths.js'

const { Text, Paragraph } = Typography

function formatEntityLine(entityType: string, entity: Record<string, unknown>): string {
  if (entity.missing) return 'Registro não encontrado'
  if (entityType === 'vaccine') {
    const parts = [
      entity.vaccineName,
      entity.applicationDate ? String(entity.applicationDate).slice(0, 10) : null,
      entity.doseNumber != null ? `Dose ${entity.doseNumber}` : null,
      entity.clinic,
    ]
    return parts.filter(Boolean).join(' · ') || 'Vacina'
  }
  if (entityType === 'exam') {
    const parts = [
      entity.examType,
      entity.examDate ? String(entity.examDate).slice(0, 10) : null,
      entity.laboratory,
      entity.resultSummary,
    ]
    return parts.filter(Boolean).join(' · ') || 'Exame'
  }
  return String(entity.id ?? 'Registro')
}

function EntityCard({
  label,
  entityType,
  entity,
}: {
  label: string
  entityType: string
  entity: Record<string, unknown>
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
      <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>{formatEntityLine(entityType, entity)}</Paragraph>
    </div>
  )
}

/**
 * Modal após login/compliance quando há candidatos de higienização pendentes (estilo Google Photos).
 */
export function HygieneLoginPrompt() {
  const { t } = useTranslation()
  const { configured, user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<HygieneCandidateItem[]>([])
  const [index, setIndex] = useState(0)
  const [resolving, setResolving] = useState(false)

  const current = items[index]

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

  const advanceAfterResolve = useCallback((resolvedId: string) => {
    const remaining = items.filter((item) => item.id !== resolvedId)
    if (remaining.length === 0) {
      closeAndMaybeSnooze(false)
      return
    }
    setItems(remaining)
    setIndex((prev) => Math.min(prev, remaining.length - 1))
  }, [items, closeAndMaybeSnooze])

  const resolve = async (decision: 'same_entity' | 'distinct' | 'dismissed') => {
    if (!current || resolving) return
    setResolving(true)
    try {
      await api.hygiene.resolve(current.id, decision)
      advanceAfterResolve(current.id)
    } finally {
      setResolving(false)
    }
  }

  if (!current) return null

  const entityA = current.entityA ?? { id: current.entityIdA }
  const entityB = current.entityB ?? { id: current.entityIdB }

  return (
    <Modal
      open={open}
      title={t('hygiene.loginPromptTitle')}
      onCancel={() => closeAndMaybeSnooze(true)}
      footer={null}
      width={560}
      destroyOnClose
    >
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {t('hygiene.loginPromptBody', { count: items.length })}
      </Paragraph>
      <Text strong style={{ display: 'block', marginBottom: 8 }}>
        {t('hygiene.entityTypeLabel', { type: current.entityType })}
      </Text>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <EntityCard label={t('hygiene.recordA')} entityType={current.entityType} entity={entityA} />
        <EntityCard label={t('hygiene.recordB')} entityType={current.entityType} entity={entityB} />
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
