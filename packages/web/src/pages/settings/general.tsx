import { Card, Select, Space, Switch, Typography, Button, Alert } from 'antd'
import { MoonOutlined, SunOutlined, ProjectOutlined, LinkOutlined, RadarChartOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { openOpsConsole } from '../../lib/ops-console-url.js'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../theme/ThemeProvider.js'
import { setLanguage } from '../../i18n/index.js'
import { AIYRACARE_TOKENS } from '../../theme/aiyracare-tokens.js'
import { ACCESSIBILITY_RESOURCES } from '../../lib/accessibility-preferences.js'
import type { AccessibilityMode } from '../../lib/accessibility-preferences.js'

const { Text, Title, Link } = Typography

export function SettingsGeneralPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode, accessibilityMode, setAccessibilityMode } = useTheme()

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Title level={5} style={{ marginTop: 0 }}>{t('settings.appearance')}</Title>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <Text>{t('settings.brandColors')}</Text>
            <Space size={4}>
              <span style={{ width: 20, height: 20, borderRadius: 6, background: AIYRACARE_TOKENS.colorPrimary, display: 'inline-block' }} title="Primary" />
              <span style={{ width: 20, height: 20, borderRadius: 6, background: AIYRACARE_TOKENS.colorInfo, display: 'inline-block' }} title="Accent" />
              <span style={{ width: 20, height: 20, borderRadius: 6, background: AIYRACARE_TOKENS.colorWarning, display: 'inline-block' }} title="IA" />
            </Space>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <Space>
              {darkMode ? <MoonOutlined /> : <SunOutlined />}
              <Text>{t('settings.darkMode')}</Text>
            </Space>
            <Switch checked={darkMode} onChange={toggleDarkMode} />
          </div>
        </Space>
      </Card>

      <Card>
        <Title level={5} style={{ marginTop: 0 }}>{t('settings.accessibility.title')}</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {t('settings.accessibility.hint')}
        </Text>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <Text>{t('settings.accessibility.modeLabel')}</Text>
          <Select<AccessibilityMode>
            value={accessibilityMode}
            onChange={setAccessibilityMode}
            style={{ width: 220 }}
            options={[
              { value: 'default', label: t('settings.accessibility.mode.default') },
              { value: 'highContrast', label: t('settings.accessibility.mode.highContrast') },
              { value: 'deuteranopia', label: t('settings.accessibility.mode.deuteranopia') },
            ]}
          />
        </div>
        <Alert
          type="info"
          showIcon
          message={t('settings.accessibility.auditTitle')}
          description={t('settings.accessibility.auditBody')}
          style={{ marginBottom: 12 }}
        />
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          {t('settings.accessibility.resourcesTitle')}
        </Text>
        <Space direction="vertical" size={4}>
          {ACCESSIBILITY_RESOURCES.map((r) => (
            <Link key={r.id} href={r.url} target="_blank" rel="noopener noreferrer">
              <LinkOutlined /> {r.label}
            </Link>
          ))}
        </Space>
      </Card>

      <Card>
        <Title level={5} style={{ marginTop: 0 }}>{t('settings.language')}</Title>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <Text>{t('settings.languageLabel')}</Text>
          <Select
            value={i18n.language}
            onChange={setLanguage}
            style={{ width: 140 }}
            options={[
              { value: 'pt-BR', label: t('settings.lang.pt') },
              { value: 'en', label: t('settings.lang.en') },
            ]}
          />
        </div>
      </Card>

      <Card>
        <Title level={5} style={{ marginTop: 0 }}>{t('settings.devTools')}</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {t('settings.devToolsHint')}
        </Text>
        <Space wrap>
          <Button type="default" icon={<ProjectOutlined />} onClick={() => navigate('/roadmap')}>
            {t('nav.roadmap')}
          </Button>
          <Button type="default" icon={<RadarChartOutlined />} onClick={() => openOpsConsole()}>
            {t('nav.ops')}
          </Button>
        </Space>
      </Card>
    </Space>
  )
}
