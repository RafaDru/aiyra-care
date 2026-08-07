import { Tag } from 'antd'
import { CloudDownloadOutlined, MedicineBoxOutlined, SafetyCertificateOutlined, GlobalOutlined, UserOutlined } from '@ant-design/icons'

const SOURCE_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  manual: { color: 'default', label: 'Manual', icon: <UserOutlined /> },
  conectesus: { color: 'green', label: 'ConecteSUS', icon: <CloudDownloadOutlined /> },
  caderneta: { color: 'blue', label: 'Caderneta', icon: <CloudDownloadOutlined /> },
  unimed: { color: 'purple', label: 'Unimed BH', icon: <MedicineBoxOutlined /> },
  amil: { color: 'red', label: 'Amil', icon: <SafetyCertificateOutlined /> },
  bradesco_saude: { color: 'blue', label: 'Bradesco Saúde', icon: <GlobalOutlined /> },
  mater_dei: { color: 'geekblue', label: 'Mater Dei', icon: <MedicineBoxOutlined /> },
}

export function SourceTag({ source }: { source?: string }) {
  const config = SOURCE_CONFIG[source || 'manual'] || SOURCE_CONFIG.manual
  return <Tag icon={config.icon} color={config.color} style={{ margin: 0 }}>{config.label}</Tag>
}
