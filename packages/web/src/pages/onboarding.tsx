import { Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '../contexts/AuthContext.js'
import { OnboardingLayout } from '../layouts/OnboardingLayout.js'
import { OnboardingWizard } from '../features/onboarding/OnboardingWizard.js'
export function OnboardingPage() {
  const { configured, loading } = useAuth()

  if (!configured) return <Navigate to="/" replace />

  if (loading) {
    return (
      <OnboardingLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      </OnboardingLayout>
    )
  }

  return (
    <OnboardingLayout>
      <OnboardingWizard />
    </OnboardingLayout>
  )
}
