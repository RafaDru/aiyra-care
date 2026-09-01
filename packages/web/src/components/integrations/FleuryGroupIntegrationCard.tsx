import { Button, Tag, Typography } from 'antd'
import { CheckCircleOutlined, RightOutlined } from '@ant-design/icons'
import { BrandLogo } from '../brands/BrandLogo.js'
import { FLEURY_LAB_BRANDS } from '../brands/fleury-group-config.js'
import { FleuryLabBrandPill } from '../brands/FleuryLabBrandPill.js'
import type { IntegrationOption } from './integration-catalog.js'

const { Text, Title } = Typography

interface Props {
  option: IntegrationOption & { linked: boolean }
  onPick: () => void
}

export function FleuryGroupIntegrationCard({ option, onPick }: Props) {
  const disabled = !option.enabled || option.linked
  const reason = option.linked
    ? 'Já vinculado'
    : option.disabledReason ?? (option.enabled ? undefined : 'Indisponível')

  return (
    <div
      style={{
        padding: '14px 12px',
        borderRadius: 12,
        border: '1px solid var(--border, #e2e8f0)',
        background: 'linear-gradient(180deg, #f8fafc 0%, #fff 100%)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.7 : 1,
      }}
      onClick={() => { if (!disabled) onPick() }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <BrandLogo brand={option.brand} variant="avatar" context="integrations" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Title level={5} style={{ margin: 0, fontSize: 15 }}>
              {option.title}
            </Title>
            {disabled && (
              <Tag
                color={option.linked ? 'success' : 'default'}
                icon={option.linked ? <CheckCircleOutlined /> : undefined}
                style={{ margin: 0 }}
              >
                {reason}
              </Tag>
            )}
          </div>
          <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
            {option.description}
          </Text>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 10,
              alignItems: 'center',
            }}
          >
            {FLEURY_LAB_BRANDS.map((b) => (
              <FleuryLabBrandPill key={b.id} brand={b} />
            ))}
          </div>
          <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 8 }}>
            Mesma conta no portal Precision Care — busque por qualquer uma das marcas acima.
          </Text>
        </div>
        {!disabled && (
          <Button type="text" size="small" icon={<RightOutlined />} aria-label="Vincular" />
        )}
      </div>
    </div>
  )
}
