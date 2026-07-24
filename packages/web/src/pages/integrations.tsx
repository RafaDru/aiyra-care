import { useState } from 'react'
import { Card, Row, Col, Typography, Tag, App } from 'antd'
import { CloudDownloadOutlined, MedicineBoxOutlined, SafetyCertificateOutlined, GlobalOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/ui/PageHeader.js'
import { ImportConecteSUSModal } from '../components/scraper/ImportConecteSUSModal.js'

const { Text } = Typography

const integrations = [
  {
    key: 'conectesus',
    name: 'ConecteSUS',
    description: 'Importe vacinas, exames e dados do paciente diretamente do SUS.',
    icon: <CloudDownloadOutlined style={{ fontSize: 32, color: '#0D9488' }} />,
    color: '#0D9488',
    available: true,
  },
  {
    key: 'unimed',
    name: 'Unimed',
    description: 'Integração com planos de saúde Unimed (em breve).',
    icon: <MedicineBoxOutlined style={{ fontSize: 32, color: '#4F46E5' }} />,
    color: '#4F46E5',
    available: false,
  },
  {
    key: 'amil',
    name: 'Amil',
    description: 'Integração com planos de saúde Amil (em breve).',
    icon: <SafetyCertificateOutlined style={{ fontSize: 32, color: '#E11D48' }} />,
    color: '#E11D48',
    available: false,
  },
  {
    key: 'bradesco_saude',
    name: 'Bradesco Saúde',
    description: 'Integração com Bradesco Saúde (em breve).',
    icon: <GlobalOutlined style={{ fontSize: 32, color: '#2563EB' }} />,
    color: '#2563EB',
    available: false,
  },
]

export function IntegrationsPage() {
  const { t } = useTranslation()
  const [conectesusOpen, setConectesusOpen] = useState(false)

  return (
    <div>
      <PageHeader title="Integrações" subtitle="Conecte-se a portais de saúde e planos" />

      <Row gutter={[20, 20]}>
        {integrations.map((int) => (
          <Col xs={24} sm={12} lg={8} xl={6} key={int.key}>
            <Card
              hoverable={int.available}
              onClick={int.available ? () => setConectesusOpen(true) : undefined}
              style={{
                borderRadius: 16,
                height: '100%',
                opacity: int.available ? 1 : 0.6,
                cursor: int.available ? 'pointer' : 'not-allowed',
              }}
              styles={{ body: { padding: 24, textAlign: 'center' } }}
            >
              <div style={{ marginBottom: 16 }}>{int.icon}</div>
              <Typography.Title level={5} style={{ margin: 0 }}>
                {int.name}
              </Typography.Title>
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                {int.description}
              </Text>
              <div style={{ marginTop: 12 }}>
                {int.available ? (
                  <Tag color="green">Disponível</Tag>
                ) : (
                  <Tag>Em breve</Tag>
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <ImportConecteSUSModal open={conectesusOpen} onClose={() => setConectesusOpen(false)} patientId="" />
    </div>
  )
}
