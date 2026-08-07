import { Modal, Table, Typography } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { LINK_ROLE_META, LINK_ROLE_OPTIONS } from './health-thread-link-roles.js'

const { Text, Paragraph } = Typography

interface Props {
  open: boolean
  onClose: () => void
  entityType?: string
}

export function LinkRoleHelpModal({ open, onClose, entityType }: Props) {
  const rows = LINK_ROLE_OPTIONS.map((code) => ({
    key: code,
    papel: LINK_ROLE_META[code].label,
    quando: LINK_ROLE_META[code].hint,
    exemplo: LINK_ROLE_META[code].example,
  }))

  return (
    <Modal
      open={open}
      title="Papéis do vínculo na trilha"
      onCancel={onClose}
      onOk={onClose}
      okText="Entendi"
      width={640}
      destroyOnClose
    >
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Indica como este item se encaixa na <strong>sequência desta trilha</strong> (não é o mesmo que
        vínculo clínico entre consulta e exame — isso virá no catálogo de relações).
      </Paragraph>
      {entityType && (
        <Paragraph style={{ marginBottom: 12 }}>
          Vinculando: <Text strong>{entityType}</Text>
        </Paragraph>
      )}
      <Table
        size="small"
        pagination={false}
        dataSource={rows}
        columns={[
          { title: 'Papel', dataIndex: 'papel', width: 140 },
          { title: 'Quando usar', dataIndex: 'quando' },
          { title: 'Exemplo', dataIndex: 'exemplo', width: 200 },
        ]}
      />
    </Modal>
  )
}

export function LinkRoleHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <QuestionCircleOutlined
      onClick={onClick}
      style={{ color: 'var(--text-secondary, #64748b)', cursor: 'pointer' }}
      aria-label="Ajuda sobre papéis do vínculo"
    />
  )
}
