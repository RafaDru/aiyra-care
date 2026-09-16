import { useEffect, useRef, useState } from 'react'
import { App, Button, Modal, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import type { AvaProposedAction } from '../../lib/api.types.js'
import { requestClinicalExportOpen, requestConsultVisitOpen } from '../../lib/clinical-export-bus.js'
import { trackProductEvent } from '../../lib/product-events.js'

interface Props {
  patientId: string
  actions: AvaProposedAction[]
  onDone?: () => void
}

export function AvaProposedActions({ patientId, actions, onDone }: Props) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [busyId, setBusyId] = useState<string | null>(null)
  const shownKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (actions.length === 0) return
    const key = actions.map((a) => a.id).join(',')
    if (shownKeyRef.current === key) return
    shownKeyRef.current = key
    trackProductEvent('ava_proposed_action_shown', {
      action_count: actions.length,
      action_type: actions[0]?.type ?? 'unknown',
    }, { patientId })
  }, [actions, patientId])

  if (actions.length === 0) return null

  const confirmTitle = (action: AvaProposedAction) => {
    switch (action.type) {
      case 'integration_sync':
        return t('ava.proposedActionConfirmSyncTitle')
      case 'clinical_export':
        return t('ava.proposedActionConfirmExportTitle')
      case 'consult_visit_open':
        return t('ava.proposedActionConfirmConsultTitle')
      case 'hygiene_merge':
        return t('ava.proposedActionConfirmHygieneMergeTitle')
      case 'hygiene_dismiss':
        return t('ava.proposedActionConfirmHygieneDismissTitle')
      default:
        return t('ava.proposedActionConfirmDefaultTitle')
    }
  }

  const confirmAndRun = (action: AvaProposedAction) => {
    Modal.confirm({
      title: confirmTitle(action),
      content: action.description ?? action.label,
      okText: t('ava.proposedActionConfirmOk'),
      cancelText: t('ava.proposedActionConfirmCancel'),
      onOk: () => run(action),
    })
  }

  const run = async (action: AvaProposedAction) => {
    setBusyId(action.id)
    try {
      const result = await api.ava.executeAction({
        type: action.type,
        payload: { ...action.payload, patientId },
      })
      if (action.type === 'clinical_export') {
        const mode = action.payload.mode === 'full' ? 'full' : 'summary'
        requestClinicalExportOpen({ patientId, mode })
      }
      if (action.type === 'consult_visit_open') {
        const mode = action.payload.mode === 'full' ? 'full' : 'summary'
        requestConsultVisitOpen({ patientId, mode })
      }
      message.success(result.message)
      trackProductEvent('ava_proposed_action_executed', {
        action_type: action.type,
        status: result.ok ? 'ok' : 'skipped',
      }, { patientId })
      onDone?.()
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : t('common.error')
      trackProductEvent('ava_proposed_action_failed', {
        action_type: action.type,
        error_code: errMsg.slice(0, 64),
      }, { patientId })
      message.error(errMsg)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="ava-proposed-actions">
      <Typography.Text type="secondary" className="ava-proposed-actions__label">
        {t('ava.proposedActionsLabel')}
      </Typography.Text>
      <Space wrap size={[8, 8]}>
        {actions.map((action) => (
          <Button
            key={action.id}
            size="small"
            type="default"
            loading={busyId === action.id}
            onClick={() => confirmAndRun(action)}
          >
            {action.label}
          </Button>
        ))}
        {actions.some((a) => a.type === 'integration_sync') && (
          <Link to={`/patients/${patientId}?section=clinical&tab=integrations`}>
            <Button size="small" type="link">{t('ava.openIntegrations')}</Button>
          </Link>
        )}
      </Space>
      {actions.some((a) => a.description) && (
        <Typography.Paragraph type="secondary" className="ava-proposed-actions__hint">
          {actions.find((a) => a.description)?.description}
        </Typography.Paragraph>
      )}
    </div>
  )
}
