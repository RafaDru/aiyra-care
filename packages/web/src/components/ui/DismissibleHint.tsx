import { useState } from 'react'
import { Alert, Button } from 'antd'
import type { AlertProps } from 'antd'
import { useTranslation } from 'react-i18next'
import { dismissHint, isHintDismissed } from '../../lib/dismissed-hints.js'

type Props = Omit<AlertProps, 'closable' | 'onClose'> & {
  hintId: string
  /** Show "Marcar como lido" action (default true). */
  acknowledge?: boolean
}

/**
 * Informational platform hint — closable and persisted in localStorage so it does not reappear.
 */
export function DismissibleHint({ hintId, acknowledge = true, action, ...rest }: Props) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(() => !isHintDismissed(hintId))

  if (!visible) return null

  const handleDismiss = () => {
    dismissHint(hintId)
    setVisible(false)
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
