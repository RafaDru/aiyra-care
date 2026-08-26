import type { AvaActivityEvent } from '../../lib/api.types.js'

function sizeClass(text: string): string {
  const len = text.length
  if (len <= 18) return 'ava-thinking-aura__cloud--sm'
  if (len <= 36) return 'ava-thinking-aura__cloud--md'
  return 'ava-thinking-aura__cloud--lg'
}

interface Props {
  text: string
  activityTrace?: AvaActivityEvent[]
}

/** Nuvem de pensamento + trilha de status (ferramentas / reflexão). */
export function AvaThinkingAura({ text, activityTrace = [] }: Props) {
  const doneLabels = activityTrace
    .filter((e) => e.status === 'done')
    .map((e) => e.label)
    .slice(-4)

  return (
    <div className="ava-thinking-aura" aria-live="polite">
      <div className="ava-thinking-aura__trail">
        <div className="ava-thinking-aura__dots" aria-hidden="true">
          <span className="ava-thinking-aura__dot ava-thinking-aura__dot--sm" />
          <span className="ava-thinking-aura__dot ava-thinking-aura__dot--md" />
          <span className="ava-thinking-aura__dot ava-thinking-aura__dot--lg" />
        </div>
        <div className={`ava-thinking-aura__cloud ${sizeClass(text)}`}>
          <span className="ava-thinking-aura__glow" aria-hidden="true" />
          <span className="ava-thinking-aura__text">{text}</span>
        </div>
      </div>
      {doneLabels.length > 0 && (
        <ul className="ava-thinking-aura__steps" aria-label="Status do processamento">
          {doneLabels.map((label, i) => (
            <li key={`${label}-${i}`} className="ava-thinking-aura__step">{label}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
