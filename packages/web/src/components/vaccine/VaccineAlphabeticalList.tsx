import { Card, Col, Row, Typography, Button, Tooltip } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { VaccineAlphabeticalGroup } from './vaccine-view-utils.js'
import { DOSE_STATUS_COLOR } from './vaccine-display-helpers.js'
import type { VaccineDoseRow } from './vaccine-view-utils.js'
import { AIYRACARE_TOKENS } from '../../theme/aiyracare-tokens.js'

const { Text, Title } = Typography

interface Props {
  groups: VaccineAlphabeticalGroup[]
  onEditVaccine?: (vaccineId: string) => void
}

function DoseDetailRow({
  row,
  isLast,
  onEditVaccine,
}: {
  row: VaccineDoseRow
  isLast: boolean
  onEditVaccine?: (vaccineId: string) => void
}) {
  const { t } = useTranslation()
  const color = DOSE_STATUS_COLOR[row.visualStatus]

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '10px 0',
        borderBottom: isLast ? 'none' : '1px solid rgba(15, 23, 42, 0.06)',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          marginTop: 6,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', alignItems: 'baseline' }}>
          <Text strong style={{ fontSize: 13 }}>{row.doseLabel}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{row.periodLabel}</Text>
          {row.editable && row.vaccineRecordId && onEditVaccine && (
            <Tooltip title={t('vaccine.edit')}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                aria-label={t('vaccine.edit')}
                onClick={() => onEditVaccine(row.vaccineRecordId!)}
                style={{ marginLeft: -4, height: 22, width: 22 }}
              />
            </Tooltip>
          )}
        </div>
        <Text style={{ fontSize: 12, display: 'block', marginTop: 2, color, lineHeight: 1.35 }}>
          {row.primaryLine}
        </Text>
        {row.secondaryLine && (
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2, lineHeight: 1.35 }}>
            {row.secondaryLine}
          </Text>
        )}
        {row.confirmationLine && (
          <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 4, lineHeight: 1.35 }}>
            {row.confirmationLine}
            {row.batch ? ` · Lote ${row.batch}` : ''}
          </Text>
        )}
      </div>
    </div>
  )
}

function VaccineGroupCard({
  group,
  onEditVaccine,
}: {
  group: VaccineAlphabeticalGroup
  onEditVaccine?: (vaccineId: string) => void
}) {
  const appliedCount = group.rows.filter((r) => r.visualStatus === 'applied').length

  return (
    <Card
      size="small"
      style={{
        height: '100%',
        borderRadius: 12,
        border: group.isExtra ? '1px dashed #C084FC' : '1px solid var(--border, #E2E8F0)',
        background: group.isExtra ? '#FDF4FF' : 'var(--card-bg, #fff)',
      }}
      styles={{ body: { padding: '14px 16px' } }}
    >
      <div style={{ marginBottom: 10 }}>
        <Text strong style={{ fontSize: 15, lineHeight: 1.3, color: AIYRACARE_TOKENS.colorPrimary }}>
          {group.vaccineName}
        </Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {group.rows.length} dose{group.rows.length !== 1 ? 's' : ''}
          </Text>
          {appliedCount > 0 && (
            <Text style={{ fontSize: 11, color: DOSE_STATUS_COLOR.applied }}>
              {appliedCount} aplicada{appliedCount !== 1 ? 's' : ''}
            </Text>
          )}
          {group.isExtra && (
            <Text style={{ fontSize: 10, color: '#7C3AED' }}>fora do calendário</Text>
          )}
        </div>
      </div>

      <div>
        {group.rows.map((row, index) => (
          <DoseDetailRow
            key={row.id}
            row={row}
            isLast={index === group.rows.length - 1}
            onEditVaccine={onEditVaccine}
          />
        ))}
      </div>
    </Card>
  )
}

export function VaccineAlphabeticalList({ groups, onEditVaccine }: Props) {
  if (groups.length === 0) return null

  return (
    <div>
      <Title level={5} style={{ marginBottom: 16 }}>Detalhamento por vacina</Title>
      <Row gutter={[16, 16]}>
        {groups.map((group) => (
          <Col key={`${group.catalogId}:${group.vaccineName}`} xs={24} sm={12} lg={8} xl={6}>
            <VaccineGroupCard group={group} onEditVaccine={onEditVaccine} />
          </Col>
        ))}
      </Row>
    </div>
  )
}
