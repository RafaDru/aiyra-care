import { Select, Switch, Space, Typography } from 'antd'
import { useTheme } from '../../theme/ThemeProvider.js'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

export function ThemeSwitcher() {
  const { palette, setPalette, darkMode, toggleDarkMode } = useTheme()
  const { t } = useTranslation()

  return (
    <Space size="middle" wrap>
      <Space size={4}>
        <Text type="secondary" style={{ fontSize: 12 }}>{t('common.palette')}</Text>
        <Select
          value={palette}
          onChange={setPalette}
          size="small"
          style={{ width: 90 }}
          options={[
            { value: 'indigo', label: 'Indigo' },
            { value: 'teal', label: 'Teal' },
            { value: 'rose', label: 'Rose' },
          ]}
        />
      </Space>
      <Space size={4}>
        {darkMode ? <MoonOutlined /> : <SunOutlined />}
        <Switch checked={darkMode} onChange={toggleDarkMode} size="small" />
      </Space>
    </Space>
  )
}
