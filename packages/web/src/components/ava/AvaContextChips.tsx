import { useTranslation } from 'react-i18next'
import { Tag } from 'antd'
import type { AvaSessionPin } from '../../lib/api.types.js'
import { api } from '../../lib/api.js'
import type { AvaEntityPin } from '../../lib/ava-dock-bus.js'

interface Props {
  conversationId: string
  pins: AvaSessionPin[]
  onPinsChange: () => void
}

function pinToEntity(pin: AvaSessionPin): AvaEntityPin {
  if (pin.entityType === 'exam_marker') {
    return { entityType: 'exam_marker', markerName: pin.entityId }
  }
  return { entityType: pin.entityType, entityId: pin.entityId }
}

export function AvaContextChips({ conversationId, pins, onPinsChange }: Props) {
  const { t } = useTranslation()

  if (!pins.length) return null

  const handleClose = async (pin: AvaSessionPin) => {
    try {
      await api.ava.patchContext(conversationId, { unpin: pinToEntity(pin) })
      onPinsChange()
    } catch {
      // ignore — parent may refresh quota/errors
    }
  }

  return (
    <div className="ava-context-chips">
      <span className="ava-context-chips__label">{t('ava.contextPinsLabel')}</span>
      {pins.map((pin) => (
        <Tag
          key={pin.id}
          closable
          onClose={(e) => {
            e.preventDefault()
            void handleClose(pin)
          }}
          className="ava-context-chips__tag"
        >
          {pin.label?.trim() || t(`ava.contextPinType.${pin.entityType}`)}
        </Tag>
      ))}
    </div>
  )
}
