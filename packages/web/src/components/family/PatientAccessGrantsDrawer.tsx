import { useEffect, useState } from 'react'
import { Button, Drawer, List, Space, Tag, Typography, message } from 'antd'
import { TeamOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'

const { Text } = Typography

interface GrantRow {
  id: string
  accountId: string
  accessLevel: string
  membershipRole: string
  email?: string | null
  displayName?: string | null
}

interface PatientAccessGrantsDrawerProps {
  patientId: string
  patientName: string
}

export function PatientAccessGrantsDrawer({ patientId, patientName }: PatientAccessGrantsDrawerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [grants, setGrants] = useState<GrantRow[]>([])
  const [loading, setLoading] = useState(false)
  const [canManage, setCanManage] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const rows = await api.patientAccess.listGrants(patientId)
      setGrants(rows)
      setCanManage(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('403') || msg.toLowerCase().includes('permissão')) {
        setCanManage(false)
      } else {
        message.error(t('family.access.loadError'))
      }
      setGrants([])
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
      message.success(t('family.access.revoked'))
      void load()
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('family.access.revokeError'))
    }
  }

  const accessLabel = (level: string) =>
    level === 'read_only' ? t('family.invite.accessReadOnly') : t('family.invite.accessFull')

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
      </Drawer>
    </>
  )
}
