import { Card, Select, Space, Switch, Typography } from 'antd'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/ui/PageHeader.js'
import { useTheme } from '../theme/ThemeProvider.js'
import { setLanguage } from '../i18n/index.js'
import { AIYRACARE_TOKENS } from '../theme/aiyracare-tokens.js'

const { Text, Title } = Typography

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { darkMode, toggleDarkMode } = useTheme()

  return (
    <div>
      <PageHeader title={t('nav.settings')} subtitle={t('settings.subtitle')} />

      <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 560 }}>
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
      </Space>
    </div>
  )
}
