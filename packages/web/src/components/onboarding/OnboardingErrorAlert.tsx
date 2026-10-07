import { Alert } from 'antd'
import { Trans } from 'react-i18next'
import { Link } from 'react-router-dom'
import { SUPPORT_CENTER_PATH } from '../../lib/support-center-path.js'

type Props = {
  message: string | null
  cpfAlreadyLinked: boolean
}

export function OnboardingErrorAlert({ message, cpfAlreadyLinked }: Props) {
  if (!message && !cpfAlreadyLinked) return null

  if (cpfAlreadyLinked) {
    return (
      <Alert
        type="error"
        showIcon
        style={{ marginBottom: 16 }}
        message={
          <Trans
            i18nKey="onboarding.cpfAlreadyLinked"
            components={{
              supportLink: <Link to={SUPPORT_CENTER_PATH} />,
            }}
          />
        }
      />
    )
  }

  return <Alert type="error" message={message} showIcon style={{ marginBottom: 16 }} />
}
