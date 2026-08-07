import { Switch, Space } from 'antd'
import { useTheme } from '../../theme/ThemeProvider.js'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'

export function ThemeSwitcher() {
  const { darkMode, toggleDarkMode } = useTheme()

  return (
    <Space size={4}>
      {darkMode ? <MoonOutlined /> : <SunOutlined />}
      <Switch checked={darkMode} onChange={toggleDarkMode} size="small" />
    </Space>
  )
}
