import { Steps, Typography } from 'antd'
import type { ChPipelineStep, ChPipelineStepState } from '../ch-pipeline-display.js'

const { Text } = Typography

function mapStepStatus(state: ChPipelineStepState): 'finish' | 'process' | 'wait' | 'error' {
  if (state === 'done') return 'finish'
  if (state === 'current') return 'process'
  if (state === 'failed') return 'error'
  return 'wait'
}

export function ChPipelineTimeline({
  steps,
  title = 'Ciclo',
  compact = false,
}: {
  steps: ChPipelineStep[]
  title?: string
  compact?: boolean
}) {
  if (steps.length === 0) return null

  const rootClass = [
    'ch-pipeline-timeline',
    compact ? 'ch-pipeline-timeline--compact' : 'ch-pipeline-timeline--detail',
  ].join(' ')

  return (
    <div className={rootClass} style={{ marginBottom: compact ? 8 : 16 }}>
      <Text strong style={{ display: 'block', marginBottom: 8 }}>
        {title}
      </Text>
      <div className="ch-pipeline-timeline__track">
        <Steps
          size="small"
          direction="horizontal"
          labelPlacement={compact ? 'horizontal' : 'vertical'}
          responsive={false}
          items={steps.map((step) => ({
            title: step.label,
            status: mapStepStatus(step.state),
            description:
              step.at || step.hint ? (
                <span className="ch-pipeline-timeline__step-desc">
                  {step.hint ? `${step.hint}` : ''}
                  {step.at
                    ? `${step.hint ? ' · ' : ''}${new Date(step.at).toLocaleString('pt-BR')}`
                    : ''}
                </span>
              ) : undefined,
          }))}
        />
      </div>
    </div>
  )
}
