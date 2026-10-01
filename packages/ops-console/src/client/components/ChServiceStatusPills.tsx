import type { ChServiceState } from '../ch-service-status.js'
import { CH_SERVICE_LABELS } from '../ch-service-status.js'

function pillClass(state: ChServiceState): string {
  switch (state) {
    case 'up':
      return 'ch-service-pill ch-service-pill--up'
    case 'degraded':
      return 'ch-service-pill ch-service-pill--degraded'
    case 'down':
      return 'ch-service-pill ch-service-pill--down'
    default:
      return 'ch-service-pill ch-service-pill--unknown'
  }
}

export function ChServiceStatusPills({
  web,
  backend,
}: {
  web: ChServiceState
  backend: ChServiceState
}) {
  return (
    <div className="ch-service-status" aria-label="Status Web e Backend">
      <span className={pillClass(web)}>
        <span className="ch-service-pill-dot" aria-hidden />
        Web {CH_SERVICE_LABELS[web]}
      </span>
      <span className={pillClass(backend)}>
        <span className="ch-service-pill-dot" aria-hidden />
        Backend {CH_SERVICE_LABELS[backend]}
      </span>
    </div>
  )
}
