import { useEffect, useState } from 'react'
import {
  Typography, Button, Space, Tag, Empty,
} from 'antd'
import { IdcardOutlined } from '@ant-design/icons'
import { api } from '../../../lib/api.js'
import type { Patient, IntegrationLink, PlanMembershipWithPlan } from '../../../lib/api.types.js'
import { BrandCoverageOperator } from '../../../components/brands/BrandCoverageOperator.js'
import { coverageBrandRowVars, coverageBrandSurfaceStyle } from '../../../components/brands/coverage-brand-surface.js'
import { brandOrFallback } from '../../../components/brands/brand-config.js'
import { GroupedAlignedTables } from '../../../components/layout/GroupedAlignedTables.js'
import { AlignedFieldGrid } from '../../../components/layout/AlignedFieldGrid.js'
import { ALIGNED_COL } from '../../../components/layout/aligned-table-columns.js'
import { formatCardNumber, formatCns } from './wallet-shared.js'
import '../../../components/brands/brand-tint-table.css'

const { Text, Title } = Typography

interface Props {
  patient: Patient
  links: IntegrationLink[]
  onViewCard: (portalKey: string) => void
}

type CoverageRow = {
  key: string
  membership: PlanMembershipWithPlan
  brand: string
  link?: IntegrationLink
}

function buildDetailFields(m: PlanMembershipWithPlan): Array<{ label: string; value: string }> {
  return [
    m.plan?.productCode && { label: 'Registro ANS', value: m.plan.productCode },
    m.plan?.networkName && { label: 'Rede', value: m.plan.networkName },
    m.plan?.segmentation && { label: 'Segmentação', value: m.plan.segmentation },
    m.plan?.accommodation && { label: 'Acomodação', value: m.plan.accommodation },
    m.plan?.geographicCoverage && { label: 'Abrangência', value: m.plan.geographicCoverage },
    m.plan?.regulationType && { label: 'Regulamentação', value: m.plan.regulationType },
    m.plan?.contractType && { label: 'Contratação', value: m.plan.contractType },
    m.plan?.contractorName && { label: 'Contratante', value: m.plan.contractorName },
    m.cns && { label: 'CNS', value: formatCns(m.cns) },
  ].filter(Boolean) as Array<{ label: string; value: string }>
}

export function CoverageTab({ patient, links, onViewCard }: Props) {
  const [memberships, setMemberships] = useState<PlanMembershipWithPlan[]>([])

  useEffect(() => {
    api.planMemberships.list(patient.id).then(setMemberships).catch(() => setMemberships([]))
  }, [patient.id, links.map((l) => `${l.id}:${l.lastSyncAt ?? ''}`).join('|')])

  const firstName = patient.name.split(' ')[0]

  const healthRows: CoverageRow[] = memberships.map((m) => {
    const brand = m.plan?.operator ?? m.source ?? 'unimed'
    const link = links.find((l) => l.id === m.integrationLinkId)
      || links.find((l) => l.portalType === brand)
    return { key: m.id, membership: m, brand, link }
  })

  const coverageColumns = [
    {
      title: 'Operadora',
      key: 'operator',
      width: ALIGNED_COL.portal,
      render: (_: unknown, row: CoverageRow) => (
        <BrandCoverageOperator brand={row.brand}>
          {brandOrFallback(row.brand).shortLabel}
        </BrandCoverageOperator>
      ),
    },
    {
      title: 'Plano',
      key: 'plan',
      width: ALIGNED_COL.plan,
      render: (_: unknown, row: CoverageRow) => (
        <Text strong>{row.membership.plan?.planName || 'Plano'}</Text>
      ),
    },
    {
      title: 'Carteirinha',
      key: 'card',
      width: ALIGNED_COL.cardNumber,
      render: (_: unknown, row: CoverageRow) => {
        const n = row.membership.memberNumber
        return n ? (formatCardNumber(n) ?? n) : <Text type="secondary">—</Text>
      },
    },
    {
      title: 'Validade',
      key: 'validTo',
      width: ALIGNED_COL.validTo,
      render: (_: unknown, row: CoverageRow) => {
        const d = row.membership.cardValidTo
        return d
          ? new Date(d).toLocaleDateString('pt-BR')
          : <Text type="secondary">—</Text>
      },
    },
    {
      title: 'Tipo',
      key: 'role',
      width: ALIGNED_COL.role,
      render: (_: unknown, row: CoverageRow) => (
        <Tag color={row.membership.status === 'active' ? 'green' : 'default'}>
          {row.membership.role === 'dependent' ? 'Dependente' : 'Titular'}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: ALIGNED_COL.actions,
      render: (_: unknown, row: CoverageRow) => (
        row.link ? (
          <Button
            type="link"
            size="small"
            icon={<IdcardOutlined />}
            onClick={() => onViewCard(row.brand)}
            style={{ paddingLeft: 0 }}
          >
            Carteirinha
          </Button>
        ) : null
      ),
    },
  ]

  const expandedRowRender = (row: CoverageRow) => {
    const m = row.membership
    const detailFields = buildDetailFields(m)

    return (
      <div className="brand-tint-expanded-inner" style={coverageBrandSurfaceStyle(row.brand)}>
        {detailFields.length > 0 && (
          <AlignedFieldGrid fields={detailFields} pairsPerRow={2} />
        )}
        {!!m.plan?.addOns?.length && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
              Aditivos
            </Text>
            <Space size={4} wrap>
              {m.plan.addOns.map((a) => <Tag key={a.description}>{a.description}</Tag>)}
            </Space>
          </div>
        )}
        {!!m.plan?.waitingPeriods?.length && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
              Carências
            </Text>
            {m.plan.waitingPeriods.map((w) => (
              <Text
                key={`${w.description}-${w.endsAt}`}
                type="secondary"
                style={{ display: 'block', fontSize: 12 }}
              >
                {w.group ? `${w.group}: ` : ''}{w.description}
                {w.endsAt ? ` · até ${new Date(w.endsAt).toLocaleDateString('pt-BR')}` : ''}
              </Text>
            ))}
          </div>
        )}
      </div>
    )
  }

  const coverageOnRow = (row: CoverageRow) => ({
    className: 'brand-tint-row',
    style: coverageBrandRowVars(row.brand),
  })

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

      <GroupedAlignedTables<CoverageRow>
        groups={[
          {
            key: 'health',
            title: 'Plano de saúde',
            data: healthRows,
          },
          {
            key: 'dental',
            title: 'Plano odontológico',
            data: [],
            empty: (
              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                  Operadoras dentais — em breve
                </Text>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum plano odontológico" />
              </div>
            ),
          },
        ]}
        columns={coverageColumns}
        rowKey="key"
        onRow={coverageOnRow}
        expandable={{
          expandedRowRender,
          expandedRowClassName: () => 'brand-tint-expanded',
          rowExpandable: (row) => {
            const m = row.membership
            return buildDetailFields(m).length > 0
              || !!m.plan?.addOns?.length
              || !!m.plan?.waitingPeriods?.length
          },
        }}
      />
    </Space>
  )
}
