import { Modal, List, Typography, Tag, Button, Space } from 'antd'
import { CheckCircleOutlined, RightOutlined } from '@ant-design/icons'
import { BrandLogo } from '../brands/BrandLogo.js'
import {
  groupIntegrationOptions,
  type IntegrationOption,
  type LinkablePortal,
} from './integration-catalog.js'

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
        avatar={<BrandLogo brand={option.brand} size={40} />}
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
  const groups = groupIntegrationOptions(linkedPortals)

  const handlePick = (option: IntegrationOption & { linked: boolean }) => {
    if (!option.enabled || option.linked) return
    onClose()
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

  return (
    <Modal
      title="Nova integração"
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      destroyOnClose
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Escolha o tipo de convênio ou portal que deseja vincular a este paciente.
      </Text>

      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        {groups.map((group) => (
          <div key={group.id}>
            <Title level={5} style={{ marginBottom: 2, fontSize: 14 }}>{group.title}</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
              {group.description}
            </Text>
            <List
              size="small"
              split
              dataSource={group.options}
              renderItem={(option) => (
                <OptionRow option={option} onPick={() => handlePick(option)} />
              )}
            />
          </div>
        ))}
      </Space>
    </Modal>
  )
}
