import { Button } from 'antd'
import { MessageFilled } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { requestAvaOpen, type AvaEntityPin } from '../../lib/ava-dock-bus.js'

interface Props {
  patientId: string
  initialMessage: string
  entityPin?: AvaEntityPin
  size?: 'small' | 'middle'
  type?: 'link' | 'text' | 'default'
  block?: boolean
}

/** Acelerador G1: abre dock global com lente, pergunta e pin de entidade. */
export function AvaAcceleratorButton({
  patientId,
  initialMessage,
  entityPin,
  size = 'small',
  type = 'link',
  block = false,
}: Props) {
  const { t } = useTranslation()

  return (
    <Button
      type={type}
      size={size}
      block={block}
      icon={<MessageFilled />}
      onClick={() =>
        requestAvaOpen({
          patientId,
          initialMessage,
          entityPin,
          autoSend: true,
        })
      }
      style={type === 'link' ? { padding: 0 } : undefined}
    >
      {t('ava.accelerator')}
    </Button>
  )
}
