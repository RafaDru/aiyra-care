import { useMemo, useState } from 'react'
import { Modal, List, Typography, Tag, Button, Space, Input } from 'antd'
import { CheckCircleOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons'
import { BrandLogo } from '../brands/BrandLogo.js'
import {
  groupIntegrationOptions,
  type IntegrationOption,
  type LinkablePortal,
} from './integration-catalog.js'
import { FleuryGroupIntegrationCard } from './FleuryGroupIntegrationCard.js'

const { Text, Title } = Typography

interface Props {
  open: boolean
  linkedPortals: Set<string>
  onClose: () => void
  onLinkPortal: (portal: LinkablePortal) => void
  onImportConectesus: () => void
  onImportCaderneta: () => void
}

function OptionRow({
  option,
  onPick,
}: {
  option: IntegrationOption & { linked: boolean }
  onPick: () => void
}) {
  const disabled = !option.enabled || option.linked
  const reason = option.linked
    ? 'Já vinculado'
    : option.disabledReason ?? (option.enabled ? undefined : 'Indisponível')

  return (
    <List.Item
      style={{
        padding: '12px 8px',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.65 : 1,
        borderRadius: 8,
      }}
      onClick={() => { if (!disabled) onPick() }}
      actions={disabled ? [
        <Tag key="status" color={option.linked ? 'success' : 'default'} icon={option.linked ? <CheckCircleOutlined /> : undefined}>
          {reason}
        </Tag>,
      ] : [
        <Button key="go" type="text" size="small" icon={<RightOutlined />} aria-label="Vincular" />,
      ]}
    >
      <List.Item.Meta
        avatar={<BrandLogo brand={option.brand} variant="avatar" context="integrations" />}
        title={<Text strong={!disabled}>{option.title}</Text>}
        description={
          <Text type="secondary" style={{ fontSize: 12 }}>{option.description}</Text>
        }
      />
    </List.Item>
  )
}

export function NewIntegrationModal({
  open,
  linkedPortals,
  onClose,
  onLinkPortal,
  onImportConectesus,
  onImportCaderneta,
}: Props) {
  const [search, setSearch] = useState('')
  const groups = useMemo(
    () => groupIntegrationOptions(linkedPortals, search),
    [linkedPortals, search],
  )
  const hasResults = groups.some((g) => g.options.length > 0)

  const handlePick = (option: IntegrationOption & { linked: boolean }) => {
    if (!option.enabled || option.linked) return
    onClose()
    setSearch('')
    if (option.action === 'conectesus') {
      onImportConectesus()
      return
    }
    if (option.action === 'caderneta') {
      onImportCaderneta()
      return
    }
    if (option.portalType) onLinkPortal(option.portalType)
  }

  const handleClose = () => {
    setSearch('')
    onClose()
  }

  return (
    <Modal
      title="Nova integração"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={560}
      destroyOnClose
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        Escolha o convênio ou portal. Busque por nome — ex.: Pardini, Fleury, Unimed.
      </Text>

      <Input
        allowClear
        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
        placeholder="Buscar integração…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
        aria-label="Buscar integração"
      />

      {!hasResults && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Nenhum resultado para &quot;{search.trim()}&quot;. Tente Pardini, Fleury ou Grupo Fleury.
        </Text>
      )}

      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        {groups.map((group) => (
          <div key={group.id}>
            <Title level={5} style={{ marginBottom: 2, fontSize: 14 }}>{group.title}</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
              {group.description}
            </Text>
            <List
              size="small"
              split={false}
              dataSource={group.options}
              renderItem={(option) => (
                option.presentation === 'fleury_group'
                  ? (
                    <div key={option.id} style={{ marginBottom: 8 }}>
                      <FleuryGroupIntegrationCard option={option} onPick={() => handlePick(option)} />
                    </div>
                  )
                  : (
                    <OptionRow key={option.id} option={option} onPick={() => handlePick(option)} />
                  )
              )}
            />
          </div>
        ))}
      </Space>
    </Modal>
  )
}
