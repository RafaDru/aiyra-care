import { Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { AvaAcceleratorButton } from './AvaAcceleratorButton.js'

interface Props {
  patientId: string
  context: 'documents' | 'export'
}

export function AvaPlatformHint({ patientId, context }: Props) {
  const { t } = useTranslation()
  const message = context === 'documents'
    ? t('ava.platformDocumentsMessage')
    : t('ava.platformExportMessage')

  return (
    <div className="ava-platform-hint">
      <Space align="start" size={12} wrap>
        <Typography.Text type="secondary">{message}</Typography.Text>
        <AvaAcceleratorButton
          patientId={patientId}
          initialMessage={message}
          type="default"
          size="small"
        />
      </Space>
    </div>
  )
}
