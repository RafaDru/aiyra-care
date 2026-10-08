import { Button, Card, Space, Tag, Typography } from 'antd'
import { RightOutlined, TeamOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FAMILY_HUB_PATH } from '../../lib/family-paths.js'
import { useFamilyPendingCount } from '../../hooks/useFamilyPendingCount.js'

const { Text } = Typography

/** Atalho compacto no Início — convites pendentes e acesso ao hub família. */
export function DashboardFamilyShortcut() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const pendingCount = useFamilyPendingCount()

  return (
    <Card
      size="small"
      hoverable
      onClick={() => navigate(FAMILY_HUB_PATH)}
      style={{
        marginBottom: 24,
        borderRadius: 'var(--border-radius, 12px)',
        border: '1px solid var(--border)',
        background: 'var(--card-bg)',
        cursor: 'pointer',
      }}
      styles={{ body: { padding: '16px 20px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <Space align="start" size={12}>
          <TeamOutlined style={{ fontSize: 22, color: 'var(--color-primary, #9333EA)', marginTop: 2 }} />
          <div>
            <Text strong style={{ display: 'block', fontSize: 15 }}>
              {t('nav.yourFamily')}
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('family.dashboardCard.description')}
            </Text>
            {pendingCount > 0 && (
              <Tag color="processing" style={{ marginTop: 8 }}>
                {t('family.dashboardCard.pending', { count: pendingCount })}
              </Tag>
            )}
          </div>
        </Space>
        <Button
          type="link"
          icon={<RightOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            navigate(FAMILY_HUB_PATH)
          }}
        >
          {t('family.dashboardCard.action')}
        </Button>
      </div>
    </Card>
  )
}
