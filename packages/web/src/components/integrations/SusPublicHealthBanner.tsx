import { useEffect, useState } from 'react'
import { Alert, Button, Space, Typography } from 'antd'
import { CloudDownloadOutlined, SyncOutlined } from '@ant-design/icons'
import { api } from '../../lib/api.js'
import type { GovBrSessionView } from '../../lib/api.types.js'

const { Text } = Typography

interface Props {
  patientId: string
  patientCpf?: string | null
  onReimport: () => void
  onImported?: () => void
}

export function SusPublicHealthBanner({ patientId, patientCpf, onReimport, onImported }: Props) {
  const [govbr, setGovbr] = useState<GovBrSessionView | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    api.account.govbrSession()
      .then(setGovbr)
      .catch(() => setGovbr(null))
  }, [patientId])

  const lastFetch = govbr?.conectesusLastFetchAt
  const lastLabel = lastFetch
    ? new Date(lastFetch).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : null

  const handleQuickSync = async () => {
    setSyncing(true)
    try {
      const r = await api.patients.conectesusSync(patientId)
      if (r.skipped === 'session_required') {
        onReimport()
        return
      }
      const session = await api.account.govbrSession().catch(() => null)
      if (session) setGovbr(session)
      onImported?.()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Alert
      type="info"
      showIcon
      style={{ marginBottom: 16 }}
      message="ConecteSUS (gov.br)"
      description={
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text type="secondary">
            {govbr?.sessionReady
              ? lastLabel
                ? `Última busca no SUS: ${lastLabel}. Reimportar traz vacinas e exames novos (sem duplicar o que já existe).`
                : 'Sessão gov.br ativa — busque ou reimporte vacinas e exames do SUS.'
              : 'Primeira importação abre gov.br para login; depois, reimport sem browser.'}
          </Text>
          {!patientCpf && (
            <Text type="warning">Cadastre o CPF do paciente para importar do ConecteSUS.</Text>
          )}
          <Space wrap>
            <Button
              size="small"
              icon={<CloudDownloadOutlined />}
              onClick={onReimport}
              disabled={!patientCpf}
            >
              Importação guiada
            </Button>
            {govbr?.sessionReady && patientCpf && (
              <Button
                size="small"
                icon={<SyncOutlined />}
                loading={syncing}
                onClick={() => void handleQuickSync()}
              >
                Reimportar agora
              </Button>
            )}
          </Space>
        </Space>
      }
    />
  )
}
