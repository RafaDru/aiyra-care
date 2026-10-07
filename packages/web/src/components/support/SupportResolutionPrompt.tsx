import { Button, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { trackProductEvent } from '../../lib/product-events.js'

const { Text } = Typography

const ESCALATION_SESSION_KEY = 'aiyracare.support_human_escalation_score'

function readEscalationScore(): number {
  try {
    const raw = sessionStorage.getItem(ESCALATION_SESSION_KEY)
    const n = raw ? Number.parseInt(raw, 10) : 0
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

function writeEscalationScore(score: number): void {
  try {
    sessionStorage.setItem(ESCALATION_SESSION_KEY, String(score))
  } catch {
    /* ignore */
  }
}

type Props = {
  reportId: string
  source: 'support_report_thank_you'
  onDone: () => void
}

export function SupportResolutionPrompt({ reportId, source, onDone }: Props) {
  const { t } = useTranslation()

  const handleDecision = (resolved: boolean) => {
    const delta = resolved ? 0 : 1
    const nextScore = readEscalationScore() + delta
    if (delta > 0) writeEscalationScore(nextScore)

    trackProductEvent('support_resolution_prompt', {
      source,
      report_id: reportId.slice(0, 36),
      decision: resolved ? 'yes' : 'no',
      human_escalation_delta: delta,
      human_escalation_score: nextScore,
    })
    onDone()
  }

  return (
    <div style={{ marginTop: 8 }}>
      <Text strong>{t('support.resolutionPromptQuestion')}</Text>
      <Space style={{ marginTop: 12 }} wrap>
        <Button type="primary" onClick={() => handleDecision(true)}>
          {t('support.resolutionPromptYes')}
        </Button>
        <Button onClick={() => handleDecision(false)}>
          {t('support.resolutionPromptNo')}
        </Button>
      </Space>
    </div>
  )
}
