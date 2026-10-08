import { Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { DownOutlined, FileTextOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext.js'
import { useAvaPatientLens } from '../ava/useAvaPatientLens.js'
import { requestConsultVisitOpen } from '../../lib/clinical-export-bus.js'

/** Menu «Fazer um pedido» no header (v1: resumo para consulta). */
export function HeaderOrderRequestsMenu() {
  const { t } = useTranslation()
  const { configured, user } = useAuth()
  const { patientId, loading } = useAvaPatientLens()

  if (!configured || !user || loading) return null

  const items: MenuProps['items'] = [
    {
      key: 'prepare-consult-summary',
      icon: <FileTextOutlined />,
      label: t('headerOrderRequests.prepareConsultSummary'),
      disabled: !patientId,
      onClick: () => {
        if (!patientId) return
        requestConsultVisitOpen({ patientId })
      },
    },
  ]

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <Button>
        {t('headerOrderRequests.trigger')}
        <DownOutlined />
      </Button>
    </Dropdown>
  )
}
