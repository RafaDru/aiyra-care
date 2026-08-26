import { useState } from 'react'
import { App, Button, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import type { AvaProposedAction } from '../../lib/api.types.js'
import { requestClinicalExportOpen } from '../../lib/clinical-export-bus.js'

interface Props {
  patientId: string
  actions: AvaProposedAction[]
  onDone?: () => void
}

export function AvaProposedActions({ patientId, actions, onDone }: Props) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [busyId, setBusyId] = useState<string | null>(null)

  if (actions.length === 0) return null

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
      message.success(result.message)
      onDone?.()
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('common.error'))
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
            onClick={() => void run(action)}
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
