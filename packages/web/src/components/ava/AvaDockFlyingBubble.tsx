import { useTranslation } from 'react-i18next'
import type { AvaDockIntroPhase } from './useAvaDockIntro.js'

interface Props {
  phase: AvaDockIntroPhase
  caregiverName?: string | null
}

/** Balão de saudação inicial — só na fase greeting. */
export function AvaDockFlyingBubble({ phase, caregiverName }: Props) {
  const { t } = useTranslation()

  if (phase !== 'greeting') return null

  const text = caregiverName
    ? t('ava.dockGreetingPersonal', { name: caregiverName })
    : t('ava.dockGreeting')

  return (
    <div className="ava-dock-bubble-anchor">
      <div className="ava-dock-float-bubble ava-dock-float-bubble--enter">
        {text}
      </div>
    </div>
  )
}
