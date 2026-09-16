import { useEffect, useState } from 'react'
import { Button, Drawer, List, Space, Tag, Typography, message, Divider } from 'antd'
import { TeamOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import { trackProductEvent } from '../../lib/product-events.js'

const { Text } = Typography

interface GrantRow {
  id: string
  accountId: string
  accessLevel: string
  membershipRole: string
  email?: string | null
  displayName?: string | null
}

interface AuditRow {
  id: string
  action: string
  accessLevel: string | null
  createdAt: string
  actor: { displayName: string | null; email: string | null }
  target: { displayName: string | null; email: string | null } | null
}

interface PatientAccessGrantsDrawerProps {
  patientId: string
  patientName: string
}

export function PatientAccessGrantsDrawer({ patientId, patientName }: PatientAccessGrantsDrawerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [grants, setGrants] = useState<GrantRow[]>([])
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(false)
  const [canManage, setCanManage] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [rows, auditRows] = await Promise.all([
        api.patientAccess.listGrants(patientId),
        api.patientAccess.listAccessAudit(patientId).catch(() => []),
      ])
      setGrants(rows)
      setAudit(auditRows)
      setCanManage(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('403') || msg.toLowerCase().includes('permissão')) {
        setCanManage(false)
      } else {
        message.error(t('family.access.loadError'))
      }
      setGrants([])
      setAudit([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) void load()
  }, [open, patientId])

  const revoke = async (grantId: string) => {
    try {
      await api.patientAccess.revokeGrant(patientId, grantId)
      trackProductEvent('patient_access_revoked', {}, { patientId })
      message.success(t('family.access.revoked'))
      void load()
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('family.access.revokeError'))
    }
  }

  const accessLabel = (level: string) =>
    level === 'read_only' ? t('family.invite.accessReadOnly') : t('family.invite.accessFull')

  const auditLabel = (action: string) => {
    const key = `family.access.audit.${action}` as const
    return t(key, { defaultValue: action })
  }

  const personLabel = (name: string | null, email: string | null) =>
    name ?? email ?? t('family.access.unknownUser')

  return (
    <>
      <Button size="small" icon={<TeamOutlined />} onClick={() => setOpen(true)}>
        {t('family.access.action')}
      </Button>
      <Drawer
        title={t('family.access.title', { name: patientName })}
        open={open}
        onClose={() => setOpen(false)}
        width={420}
      >
        {grants.length === 0 && !loading ? (
          <Text type="secondary">{t('family.access.empty')}</Text>
        ) : (
          <List
            loading={loading}
            dataSource={grants}
            renderItem={(g) => (
              <List.Item
                actions={
                  canManage && g.membershipRole !== 'self'
                    ? [
                        <Button key="revoke" type="link" danger size="small" onClick={() => void revoke(g.id)}>
                          {t('family.access.revoke')}
                        </Button>,
                      ]
                    : undefined
                }
              >
                <Space direction="vertical" size={0}>
                  <Text strong>{g.displayName ?? g.email ?? g.accountId.slice(0, 8)}</Text>
                  {g.email && g.displayName ? <Text type="secondary">{g.email}</Text> : null}
                  <Space size={4}>
                    <Tag>{accessLabel(g.accessLevel)}</Tag>
                    <Tag>{g.membershipRole}</Tag>
                  </Space>
                </Space>
              </List.Item>
            )}
          />
        )}
        {!canManage && grants.length > 0 ? (
          <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
            {t('family.access.viewOnly')}
          </Text>
        ) : null}
        {canManage && audit.length > 0 ? (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <Text strong>{t('family.access.auditTitle')}</Text>
            <List
              size="small"
              style={{ marginTop: 8 }}
              dataSource={audit}
              renderItem={(row) => (
                <List.Item>
                  <Space direction="vertical" size={0}>
                    <Text>{auditLabel(row.action)}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {personLabel(row.actor.displayName, row.actor.email)}
                      {row.target
                        ? ` → ${personLabel(row.target.displayName, row.target.email)}`
                        : ''}
                      {' · '}
                      {new Date(row.createdAt).toLocaleString('pt-BR')}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          </>
        ) : null}
      </Drawer>
    </>
  )
}
