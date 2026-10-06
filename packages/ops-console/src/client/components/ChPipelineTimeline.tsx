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

  return (
    <div style={{ marginBottom: compact ? 8 : 16 }}>
      <Text strong style={{ display: 'block', marginBottom: 8 }}>
        {title}
      </Text>
      <Steps
        size="small"
        direction={compact ? 'horizontal' : 'horizontal'}
        responsive
        items={steps.map((step) => ({
          title: step.label,
          status: mapStepStatus(step.state),
          description:
            step.at || step.hint ? (
              <span style={{ fontSize: 11 }}>
                {step.hint ? `${step.hint}` : ''}
                {step.at
                  ? `${step.hint ? ' · ' : ''}${new Date(step.at).toLocaleString('pt-BR')}`
                  : ''}
              </span>
            ) : undefined,
        }))}
      />
    </div>
  )
}
