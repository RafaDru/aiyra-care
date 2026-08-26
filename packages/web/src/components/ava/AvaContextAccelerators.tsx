import { useEffect, useState } from 'react'
import { Button, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { AvaContextSuggestion } from '../../lib/api.types.js'

interface Props {
  patientId: string
  onSelect: (message: string) => void
  disabled?: boolean
}

export function AvaContextAccelerators({ patientId, onSelect, disabled }: Props) {
  const { t } = useTranslation()
  const [items, setItems] = useState<AvaContextSuggestion[]>([])

  useEffect(() => {
    api.ava.contextSuggestions(patientId)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
  }, [patientId])

  if (items.length === 0) return null

  return (
    <div className="ava-context-accelerators">
      <Typography.Text type="secondary" className="ava-context-accelerators__label">
        {t('ava.contextAcceleratorsLabel')}
      </Typography.Text>
      <Space wrap size={[8, 8]}>
        {items.map((item) => (
          <Button
            key={item.id}
            size="small"
            disabled={disabled}
            onClick={() => onSelect(item.message)}
          >
            {item.label}
          </Button>
        ))}
      </Space>
    </div>
  )
}
