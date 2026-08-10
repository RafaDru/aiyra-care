import { useEffect, useState } from 'react'
import {
  Typography, Button, Space, Tag, Empty, Collapse, Descriptions, Divider,
} from 'antd'
import { IdcardOutlined } from '@ant-design/icons'
import { api } from '../../../lib/api.js'
import type { Patient, IntegrationLink, PlanMembershipWithPlan } from '../../../lib/api.types.js'
import { BrandTag } from '../../../components/brands/BrandLogo.js'
import { brandOrFallback } from '../../../components/brands/brand-config.js'
import { formatCardNumber, formatCns } from './wallet-shared.js'

const { Text, Title } = Typography

interface Props {
  patient: Patient
  links: IntegrationLink[]
  onViewCard: (portalKey: string) => void
}

export function CoverageTab({ patient, links, onViewCard }: Props) {
  const [memberships, setMemberships] = useState<PlanMembershipWithPlan[]>([])

  useEffect(() => {
    api.planMemberships.list(patient.id).then(setMemberships).catch(() => setMemberships([]))
  }, [patient.id, links.map((l) => `${l.id}:${l.lastSyncAt ?? ''}`).join('|')])

  const firstName = patient.name.split(' ')[0]

  if (!memberships.length) {
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Title level={5} style={{ marginBottom: 4 }}>Convênios de {firstName}</Title>
          <Text type="secondary">
            Cobertura, rede e carências sincronizadas dos operadores. Vincule e sincronize em Integrações.
          </Text>
        </div>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum plano sincronizado ainda" />
      </Space>
    )
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Title level={5} style={{ marginBottom: 4 }}>Convênios de {firstName}</Title>
        <Text type="secondary">
          Contrato, rede ANS, carências e validade — dados vindos do sync dos portais.
        </Text>
      </div>

      <Collapse
        items={memberships.map((m) => {
          const brand = m.plan?.operator ?? m.source ?? 'unimed'
          const meta = brandOrFallback(brand)
          const link = links.find((l) => l.id === m.integrationLinkId)
            || links.find((l) => l.portalType === brand)
          const rows = [
            m.plan?.productCode && { label: 'Registro ANS', value: m.plan.productCode },
            m.plan?.networkName && { label: 'Rede', value: m.plan.networkName },
            m.plan?.segmentation && { label: 'Segmentação', value: m.plan.segmentation },
            m.plan?.accommodation && { label: 'Acomodação', value: m.plan.accommodation },
            m.plan?.geographicCoverage && { label: 'Abrangência', value: m.plan.geographicCoverage },
            m.plan?.regulationType && { label: 'Regulamentação', value: m.plan.regulationType },
            m.plan?.contractType && { label: 'Contratação', value: m.plan.contractType },
            m.plan?.contractorName && { label: 'Contratante', value: m.plan.contractorName },
            m.memberNumber && { label: 'Carteirinha', value: formatCardNumber(m.memberNumber) ?? m.memberNumber },
            m.cns && { label: 'CNS', value: formatCns(m.cns) },
            m.cardValidTo && {
              label: 'Validade',
              value: new Date(m.cardValidTo).toLocaleDateString('pt-BR'),
            },
          ].filter(Boolean) as Array<{ label: string; value: string }>

          return {
            key: m.id,
            label: (
              <Space wrap>
                <BrandTag brand={brand}>{meta.shortLabel}</BrandTag>
                <Text strong>{m.plan?.planName || 'Plano'}</Text>
                <Tag color={m.status === 'active' ? 'green' : 'default'}>
                  {m.role === 'dependent' ? 'Dependente' : 'Titular'}
                </Tag>
              </Space>
            ),
            children: (
              <div>
                {rows.length > 0 && (
                  <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 12 }}>
                    {rows.map((r) => (
                      <Descriptions.Item key={r.label} label={r.label}>{r.value}</Descriptions.Item>
                    ))}
                  </Descriptions>
                )}
                {!!m.plan?.addOns?.length && (
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">Aditivos: </Text>
                    {m.plan.addOns.map((a) => <Tag key={a.description}>{a.description}</Tag>)}
                  </div>
                )}
                {!!m.plan?.waitingPeriods?.length && (
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Carências</Text>
                    {m.plan.waitingPeriods.map((w) => (
                      <Text key={`${w.description}-${w.endsAt}`} type="secondary" style={{ display: 'block', fontSize: 12 }}>
                        {w.group ? `${w.group}: ` : ''}{w.description}
                        {w.endsAt ? ` · até ${new Date(w.endsAt).toLocaleDateString('pt-BR')}` : ''}
                      </Text>
                    ))}
                  </div>
                )}
                {link && (
                  <Button
                    type="link"
                    size="small"
                    icon={<IdcardOutlined />}
                    onClick={() => onViewCard(brand)}
                    style={{ paddingLeft: 0 }}
                  >
                    Ver carteirinha na aba Carteira
                  </Button>
                )}
              </div>
            ),
          }
        })}
      />

      <Divider style={{ margin: '8px 0' }} />

      <div>
        <Text strong style={{ display: 'block', marginBottom: 4 }}>Plano odontológico</Text>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
          Operadoras dentais — em breve
        </Text>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum plano odontológico" />
      </div>
    </Space>
  )
}
