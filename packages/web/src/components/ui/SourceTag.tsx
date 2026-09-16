import { Tag } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { brandOrFallback, brandForPortal } from '../brands/brand-config.js'
import { BrandLogo } from '../brands/BrandLogo.js'

export function SourceTag({ source }: { source?: string }) {
  if (!source || source === 'manual') {
    return (
      <Tag icon={<UserOutlined />} color="default" style={{ margin: 0, fontSize: 11 }}>
        Manual
      </Tag>
    )
  }

  const meta = brandForPortal(source) ?? brandOrFallback(source)

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px 2px 4px',
        borderRadius: 8,
        background: `${meta.color}14`,
        border: `1px solid ${meta.color}33`,
        boxShadow: `inset 2px 0 0 ${meta.color}`,
        fontSize: 12,
        fontWeight: 600,
        color: meta.color,
        lineHeight: 1.2,
      }}
    >
      <BrandLogo brand={meta.key} size={20} compact compactMax={18} />
      <span>{meta.shortLabel}</span>
    </span>
  )
}
