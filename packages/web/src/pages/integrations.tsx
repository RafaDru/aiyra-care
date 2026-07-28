import { useEffect, useState } from 'react'
import { Card, Row, Col, Typography, Tag, Select, Alert, Button } from 'antd'
import { CloudDownloadOutlined, MedicineBoxOutlined, SafetyCertificateOutlined, GlobalOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader.js'
import { ImportConecteSUSModal } from '../components/scraper/ImportConecteSUSModal.js'
import { ImportInsuranceModal } from '../components/scraper/ImportInsuranceModal.js'
import { api } from '../lib/api.js'
import type { Patient } from '../lib/api.types.js'

const { Text } = Typography

const integrations = [
  {
    key: 'conectesus',
    name: 'ConecteSUS',
    description: 'Importe vacinas e exames do SUS (gov.br).',
    icon: <CloudDownloadOutlined style={{ fontSize: 32, color: '#0D9488' }} />,
    available: true,
    modalType: 'conectesus' as const,
  },
  {
    key: 'unimed',
    name: 'Unimed BH',
    description: 'Importe dados do beneficiário Unimed BH (e-mail + senha).',
    icon: <MedicineBoxOutlined style={{ fontSize: 32, color: '#4F46E5' }} />,
    available: true,
    modalType: 'insurance' as const,
    portalName: 'unimed' as const,
  },
  {
    key: 'amil',
    name: 'Amil',
    description: 'Importe dados do beneficiário do plano Amil.',
    icon: <SafetyCertificateOutlined style={{ fontSize: 32, color: '#E11D48' }} />,
    available: true,
    modalType: 'insurance' as const,
    portalName: 'amil' as const,
  },
  {
    key: 'bradesco_saude',
    name: 'Bradesco Saúde',
    description: 'Importe dados do beneficiário do plano Bradesco Saúde.',
    icon: <GlobalOutlined style={{ fontSize: 32, color: '#2563EB' }} />,
    available: true,
    modalType: 'insurance' as const,
    portalName: 'bradesco_saude' as const,
  },
]

export function IntegrationsPage() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientId, setPatientId] = useState<string>()
  const [conectesusOpen, setConectesusOpen] = useState(false)
  const [insuranceOpen, setInsuranceOpen] = useState<{ portal: 'unimed' | 'amil' | 'bradesco_saude'; label: string } | null>(null)

  useEffect(() => {
    api.patients.list().then(setPatients).catch(() => {})
  }, [])

  const handleCardClick = (int: typeof integrations[number]) => {
    if (!int.available) return
    if (!patientId) return
    if (int.modalType === 'conectesus') setConectesusOpen(true)
    else if (int.modalType === 'insurance') {
      setInsuranceOpen({ portal: int.portalName, label: int.name })
    }
  }

  return (
    <div>
      <PageHeader title="Integrações" subtitle="Conecte portais de saúde ao cadastro de um paciente" />

      <Alert
        type="info"
        showIcon
        icon={<UserOutlined />}
        style={{ marginBottom: 20 }}
        message="Integrações são por paciente"
        description="Selecione o paciente e depois o portal. Você também pode gerenciar vínculos na ficha do paciente."
      />

      <div style={{ marginBottom: 20, maxWidth: 420 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>Paciente</Text>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Selecione o paciente"
          style={{ width: '100%' }}
          value={patientId}
          onChange={setPatientId}
          options={patients.map((p) => ({ value: p.id, label: p.name }))}
        />
        {patientId && (
          <Button type="link" style={{ paddingLeft: 0, marginTop: 4 }} onClick={() => navigate(`/patients/${patientId}`)}>
            Abrir ficha do paciente
          </Button>
        )}
      </div>

      <Row gutter={[20, 20]}>
        {integrations.map((int) => {
          const enabled = int.available && !!patientId
          return (
            <Col xs={24} sm={12} lg={8} xl={6} key={int.key}>
              <Card
                hoverable={enabled}
                onClick={() => enabled && handleCardClick(int)}
                style={{
                  borderRadius: 16,
                  height: '100%',
                  opacity: enabled ? 1 : 0.55,
                  cursor: enabled ? 'pointer' : 'not-allowed',
                }}
                styles={{ body: { padding: 24, textAlign: 'center' } }}
              >
                <div style={{ marginBottom: 16 }}>{int.icon}</div>
                <Typography.Title level={5} style={{ margin: 0 }}>{int.name}</Typography.Title>
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>{int.description}</Text>
                <div style={{ marginTop: 12 }}>
                  {!patientId ? <Tag>Selecione um paciente</Tag>
                    : int.available ? <Tag color="green">Disponível</Tag> : <Tag>Em breve</Tag>}
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>

      {patientId && (
        <ImportConecteSUSModal
          open={conectesusOpen}
          onClose={() => setConectesusOpen(false)}
          patientId={patientId}
        />
      )}
      {patientId && insuranceOpen && (
        <ImportInsuranceModal
          open={!!insuranceOpen}
          onClose={() => setInsuranceOpen(null)}
          portal={insuranceOpen.portal}
          label={insuranceOpen.label}
          patientId={patientId}
          usesEmail={insuranceOpen.portal === 'unimed'}
        />
      )}
    </div>
  )
}
