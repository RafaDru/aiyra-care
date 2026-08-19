import { useTranslation } from 'react-i18next'
import type { AvaDockIntroPhase } from './useAvaDockIntro.js'

interface Props {
  phase: AvaDockIntroPhase
}

/** Balão absoluto à esquerda da Ava — não altera o fluxo do layout. */
export function AvaDockFlyingBubble({ phase }: Props) {
  const { t } = useTranslation()

  if (phase === 'done') return null

  const text = phase === 'greeting' ? t('ava.dockGreeting') : t('ava.dockOffer')

  return (
    <div className="ava-dock-bubble-anchor">
      <div className="ava-dock-float-bubble ava-dock-float-bubble--enter" key={phase}>
        {text}
      </div>
    </div>
  )
}
