import { Typography } from 'antd'

const { Text } = Typography

export function OpsTabObjective({ children }: { children: string }) {
  return (
    <div className="ops-tab-objective" role="note">
      <Text>{children}</Text>
    </div>
  )
}
