import { useState } from 'react'
import { Alert, Button } from 'antd'
import type { AlertProps } from 'antd'
import { useTranslation } from 'react-i18next'
import { dismissHint, isHintDismissed } from '../../lib/dismissed-hints.js'

type Props = Omit<AlertProps, 'closable' | 'onClose'> & {
  hintId: string
  /** Show "Marcar como lido" action (default true). */
  acknowledge?: boolean
  /** Persist dismiss in localStorage (default true). */
  persist?: boolean
  /** Called after dismiss (e.g. to refresh parent visibility). */
  onClose?: () => void
}

/**
 * Informational platform hint — closable and persisted in localStorage so it does not reappear.
 */
export function DismissibleHint({
  hintId,
  acknowledge = true,
  persist = true,
  action,
  onClose,
  ...rest
}: Props) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(() => persist ? !isHintDismissed(hintId) : true)

  if (!visible) return null

  const handleDismiss = () => {
    if (persist) dismissHint(hintId)
    setVisible(false)
    onClose?.()
  }

  const dismissAction = acknowledge ? (
    <Button size="small" type="link" onClick={handleDismiss}>
      {t('common.markAsRead')}
    </Button>
  ) : undefined

  return (
    <Alert
      {...rest}
      closable
      onClose={handleDismiss}
      action={action ?? dismissAction}
    />
  )
}
