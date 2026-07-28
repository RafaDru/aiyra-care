import { Table, Tag, Space, Typography, Descriptions, List } from 'antd'
import { CheckCircleFilled, CloseCircleFilled, ClockCircleFilled } from '@ant-design/icons'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { SourceTag } from '../../../components/ui/SourceTag.js'
import type { Authorization } from '../../../lib/api.types.js'

const { Text } = Typography

interface Props { patientId: string }

const STATUS_COLOR: Record<string, string> = {
  authorized: 'blue',
  used: 'green',
  expired: 'red',
  cancelled: 'default',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  authorized: <ClockCircleFilled />,
  used: <CheckCircleFilled />,
  expired: <CloseCircleFilled />,
}

export function AuthorizationsTab({ patientId }: Props) {
  const { data, loading } = usePatientEntity<Authorization>(api.authorizations.list, patientId)

  const columns = [
    {
      title: 'Pedido',
      dataIndex: 'solicitationNumber',
      render: (v: string | null, r: Authorization) => v || r.guideNumber || '-',
    },
    {
      title: 'Classificação',
      dataIndex: 'classification',
      render: (v: string | null, r: Authorization) => v || r.procedureDescription || '-',
    },
    {
      title: 'Senha',
      dataIndex: 'guidePassword',
      render: (v: string | null) => v ? <Tag color="gold">{v}</Tag> : '-',
    },
    { title: 'Médico', dataIndex: 'doctorName', render: (v: string | null) => v ?? '-' },
    { title: 'Especialidade', dataIndex: 'specialty', render: (v: string | null) => v ?? '-' },
    {
      title: 'Data Autorização', dataIndex: 'authorizationDate',
      render: (v: string | null) => v ? new Date(v).toLocaleDateString('pt-BR') : '-',
    },
    {
      title: 'Validade', dataIndex: 'validityDate',
      render: (v: string | null) => v ? <Tag color={new Date(v) < new Date() ? 'red' : 'green'}>{new Date(v).toLocaleDateString('pt-BR')}</Tag> : '-',
    },
    {
      title: 'Status', dataIndex: 'status',
      render: (v: string) => (
        <Tag color={STATUS_COLOR[v] || 'blue'} icon={STATUS_ICON[v]}>
          {statusLabel(v)}
        </Tag>
      ),
    },
    {
      title: 'Itens',
      dataIndex: 'items',
      render: (_: unknown, r: Authorization) => r.items?.length ?? r.quantity ?? 0,
    },
    { title: 'Origem', dataIndex: 'source', render: (v: string) => <SourceTag source={v} /> },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ padding: '8px 12px' }}>
              <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
                <Descriptions.Item label="CRM">{record.doctorCouncil || '-'}</Descriptions.Item>
                <Descriptions.Item label="Tipo">{record.authorizationType || '-'}</Descriptions.Item>
                <Descriptions.Item label="Consulta origem">
                  {record.medicalRecordId
                    ? <Tag color="cyan">Vinculada · {record.authorizationDate ? new Date(record.authorizationDate).toLocaleDateString('pt-BR') : '—'}</Tag>
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Prestador ID">{record.providerExternalId || '-'}</Descriptions.Item>
                <Descriptions.Item label="Endereço" span={2}>{record.localAddress || '-'}</Descriptions.Item>
                <Descriptions.Item label="Telefone">{record.localPhone || '-'}</Descriptions.Item>
                <Descriptions.Item label="SolicId">{record.solicId || '-'}</Descriptions.Item>
              </Descriptions>

              {record.items?.length > 0 && (
                <List
                  size="small"
                  header={<Text strong>Procedimentos ({record.items.length})</Text>}
                  bordered
                  dataSource={record.items}
                  renderItem={(item) => (
                    <List.Item>
                      <Space>
                        {item.procedureCode && <Tag>{item.procedureCode}</Tag>}
                        <Text>{item.procedureDescription}</Text>
                        {item.status && <Tag color="blue">{statusLabel(item.status)}</Tag>}
                      </Space>
                    </List.Item>
                  )}
                />
              )}

              {record.history && record.history.length > 0 && (
                <List
                  size="small"
                  header={<Text strong>Histórico</Text>}
                  style={{ marginTop: 12 }}
                  bordered
                  dataSource={record.history}
                  renderItem={(h) => (
                    <List.Item>
                      <Text type="secondary">
                        {h.occurredAt ? new Date(h.occurredAt).toLocaleString('pt-BR') : '-'}
                        {' · '}
                        {h.description || h.code || '-'}
                      </Text>
                    </List.Item>
                  )}
                />
              )}
            </div>
          ),
        }}
      />
    </Space>
  )
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { authorized: 'Autorizado', used: 'Utilizado', expired: 'Expirado', cancelled: 'Cancelado' }
  return map[status] || status
}
