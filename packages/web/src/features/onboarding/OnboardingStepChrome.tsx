import { Steps, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { ONBOARDING_WIZARD_STEP_COUNT } from './constants.js'

const { Text } = Typography

type OnboardingWizardFrameProps = {
  stepsCurrent: number
  children: React.ReactNode
}

export function OnboardingWizardSteps({ stepsCurrent }: { stepsCurrent: number }) {
  const { t } = useTranslation()

  return (
    <>
      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
        {t('onboarding.stepProgress', { current: stepsCurrent + 1, total: ONBOARDING_WIZARD_STEP_COUNT })}
      </Text>
      <Steps
        current={stepsCurrent}
        style={{ marginBottom: 20 }}
        responsive
        size="small"
        aria-label={t('onboarding.stepsAria')}
        data-testid="onboarding-wizard-steps"
        items={[
          { title: t('onboarding.steps.profile'), description: t('onboarding.steps.profileHint') },
          { title: t('onboarding.steps.families'), description: t('onboarding.steps.familiesHint') },
          { title: t('onboarding.steps.complete'), description: t('onboarding.steps.completeHint') },
        ]}
      />
    </>
  )
}

export function OnboardingStepChrome({ stepsCurrent, children }: OnboardingWizardFrameProps) {
  return (
    <>
      <OnboardingWizardSteps stepsCurrent={stepsCurrent} />
      {children}
    </>
  )
}
